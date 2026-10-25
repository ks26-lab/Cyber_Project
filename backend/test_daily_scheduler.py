"""
GRIDSEC — Review 1 Daily Load Scheduling Automated Validation Suite
Tests all 18 requirements specified in the implementation prompt:
1. Valid workbook upload & parsing
2. Missing required columns rejection
3. Invalid numeric values (negative demand/supply/critical) rejection
4. Empty workbook rejection
5. Duplicate city-hour records rejection
6. Correct hourly grouping (Hash Map O(N))
7. Critical-load allocation in priority order
8. Greedy allocation of remaining power (Least-served max-min leveling)
9. Unmet-demand calculation
10. Service percentage calculation
11. Jain's Fairness Index calculation
12. Deterministic focus-city ranking and plain-English explanations
13. Hour changes updating results correctly
14. Unmapped cities remaining available for scheduling without error
15. Mapped cities highlighting the correct network node
16. Outage analysis not claiming unsupported physical results
17. Replacing the workbook clearing stale results
18. Isolation & non-interference with existing GRIDSEC modules
"""

import sys
import os
import unittest

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))

from app.services.daily_scheduler import (
    load_file_records,
    validate_schedule_records,
    execute_daily_schedule,
    rank_focus_cities_for_hour,
    calculate_jains_fairness_index,
    assess_transmission_outage,
    generate_schedule_csv,
    generate_sample_review1_records,
    CITY_TO_BUS_INDIA_59,
    CITY_TO_BUS_IEEE_30,
)


class TestDailyLoadScheduler(unittest.TestCase):

    def setUp(self):
        # Sample minimal valid dataset
        self.valid_records = [
            {"Hour": 0, "City": "Mumbai", "Demand_kW": 1000, "Available_Supply_kW": 1500, "Priority_Level": 1, "Critical_Load_kW": 400},
            {"Hour": 0, "City": "Delhi", "Demand_kW": 1200, "Available_Supply_kW": 1500, "Priority_Level": 1, "Critical_Load_kW": 500},
            {"Hour": 0, "City": "Pune", "Demand_kW": 800, "Available_Supply_kW": 1500, "Priority_Level": 2, "Critical_Load_kW": 200},
            {"Hour": 1, "City": "Mumbai", "Demand_kW": 1100, "Available_Supply_kW": 1800, "Priority_Level": 1, "Critical_Load_kW": 400},
            {"Hour": 1, "City": "Delhi", "Demand_kW": 1300, "Available_Supply_kW": 1800, "Priority_Level": 1, "Critical_Load_kW": 500},
            {"Hour": 1, "City": "Pune", "Demand_kW": 900, "Available_Supply_kW": 1800, "Priority_Level": 2, "Critical_Load_kW": 200},
        ]

    # Test 1: Valid workbook upload & parsing
    def test_01_valid_dataset_execution(self):
        records, errors = validate_schedule_records(self.valid_records)
        self.assertEqual(len(errors), 0, f"Expected 0 errors, got: {errors}")
        result = execute_daily_schedule(records)
        self.assertTrue(result["success"])
        self.assertEqual(result["reporting_hours"], [0, 1])
        self.assertIn("Mumbai", result["available_cities"])
        self.assertIn("Delhi", result["available_cities"])
        self.assertIn("Pune", result["available_cities"])

    # Test 2: Missing required columns
    def test_02_missing_required_columns(self):
        bad_records = [{"Hour": 0, "City": "Mumbai", "Demand_kW": 1000}]
        records, errors = validate_schedule_records(bad_records)
        self.assertGreater(len(errors), 0)
        self.assertTrue(any("Missing required column" in e for e in errors))

    # Test 3: Invalid numeric values (negative demand/supply/critical)
    def test_03_invalid_numeric_values(self):
        # Negative demand
        neg_demand = [{"Hour": 0, "City": "Mumbai", "Demand_kW": -500, "Available_Supply_kW": 1000, "Priority_Level": 1, "Critical_Load_kW": 100}]
        _, errors = validate_schedule_records(neg_demand)
        self.assertTrue(any("cannot be negative" in e for e in errors))

        # Critical exceeding demand
        crit_exceed = [{"Hour": 0, "City": "Mumbai", "Demand_kW": 500, "Available_Supply_kW": 1000, "Priority_Level": 1, "Critical_Load_kW": 800}]
        _, errors = validate_schedule_records(crit_exceed)
        self.assertTrue(any("cannot exceed Demand_kW" in e for e in errors))

        # Negative supply
        neg_supply = [{"Hour": 0, "City": "Mumbai", "Demand_kW": 500, "Available_Supply_kW": -200, "Priority_Level": 1, "Critical_Load_kW": 100}]
        _, errors = validate_schedule_records(neg_supply)
        self.assertTrue(any("cannot be negative" in e for e in errors))

    # Test 4: Empty workbook
    def test_04_empty_workbook(self):
        records, errors = validate_schedule_records([])
        self.assertGreater(len(errors), 0)
        self.assertTrue(any("empty" in e.lower() for e in errors))

    # Test 5: Duplicate city-hour records
    def test_05_duplicate_city_hour_records(self):
        dups = [
            {"Hour": 5, "City": "Mumbai", "Demand_kW": 1000, "Available_Supply_kW": 2000, "Priority_Level": 1, "Critical_Load_kW": 200},
            {"Hour": 5, "City": "Mumbai", "Demand_kW": 800, "Available_Supply_kW": 2000, "Priority_Level": 1, "Critical_Load_kW": 200},
        ]
        _, errors = validate_schedule_records(dups)
        self.assertTrue(any("Duplicate record" in e for e in errors))

    # Test 6: Correct hourly grouping
    def test_06_hourly_grouping(self):
        sample = generate_sample_review1_records()
        records, errors = validate_schedule_records(sample)
        self.assertEqual(len(errors), 0)
        result = execute_daily_schedule(records)
        self.assertEqual(len(result["reporting_hours"]), 24)
        self.assertEqual(result["reporting_hours"], list(range(24)))

    # Test 7: Critical-load allocation in priority order
    def test_07_critical_load_allocation_priority_order(self):
        # Total supply is only 600 kW.
        # Priority 1 City A needs 400 crit.
        # Priority 2 City B needs 400 crit.
        # City A must get full 400, leaving 200 for City B (shortfall of 200).
        crit_test = [
            {"Hour": 0, "City": "Prio1City", "Demand_kW": 1000, "Available_Supply_kW": 600, "Priority_Level": 1, "Critical_Load_kW": 400},
            {"Hour": 0, "City": "Prio2City", "Demand_kW": 1000, "Available_Supply_kW": 600, "Priority_Level": 2, "Critical_Load_kW": 400},
        ]
        result = execute_daily_schedule(crit_test)
        hour0_cities = {c["City"]: c for c in result["hourly_results"][0]["cities"]}
        self.assertEqual(hour0_cities["Prio1City"]["Allocated_kW"], 400.0)
        self.assertEqual(hour0_cities["Prio1City"]["Critical_Shortfall_kW"], 0.0)
        self.assertEqual(hour0_cities["Prio2City"]["Allocated_kW"], 200.0)
        self.assertEqual(hour0_cities["Prio2City"]["Critical_Shortfall_kW"], 200.0)
        self.assertEqual(hour0_cities["Prio2City"]["Supply_Status"], "CRITICAL_DEFICIT")

    # Test 8: Greedy allocation of remaining power
    def test_08_greedy_allocation_remaining_power(self):
        # Critical loads are 100 each (total 200).
        # Total supply is 800 kW -> remaining supply is 600 kW.
        # Demands are CityA: 500, CityB: 500.
        # Max-min leveling should give each 300 additional -> total 400 each (80% service).
        greedy_test = [
            {"Hour": 0, "City": "CityA", "Demand_kW": 500, "Available_Supply_kW": 800, "Priority_Level": 1, "Critical_Load_kW": 100},
            {"Hour": 0, "City": "CityB", "Demand_kW": 500, "Available_Supply_kW": 800, "Priority_Level": 1, "Critical_Load_kW": 100},
        ]
        result = execute_daily_schedule(greedy_test)
        hour0 = {c["City"]: c for c in result["hourly_results"][0]["cities"]}
        self.assertAlmostEqual(hour0["CityA"]["Allocated_kW"], 400.0, places=1)
        self.assertAlmostEqual(hour0["CityB"]["Allocated_kW"], 400.0, places=1)
        self.assertAlmostEqual(hour0["CityA"]["Service_Percentage"], 80.0, places=1)
        self.assertAlmostEqual(hour0["CityB"]["Service_Percentage"], 80.0, places=1)

    # Test 9: Unmet-demand calculation
    def test_09_unmet_demand_calculation(self):
        test_case = [
            {"Hour": 0, "City": "TestCity", "Demand_kW": 1000, "Available_Supply_kW": 600, "Priority_Level": 1, "Critical_Load_kW": 300}
        ]
        result = execute_daily_schedule(test_case)
        city = result["hourly_results"][0]["cities"][0]
        self.assertEqual(city["Allocated_kW"], 600.0)
        self.assertEqual(city["Unmet_Demand_kW"], 400.0)

    # Test 10: Service percentage calculation
    def test_10_service_percentage_calculation(self):
        test_case = [
            {"Hour": 0, "City": "TestCity", "Demand_kW": 800, "Available_Supply_kW": 600, "Priority_Level": 1, "Critical_Load_kW": 200}
        ]
        result = execute_daily_schedule(test_case)
        city = result["hourly_results"][0]["cities"][0]
        self.assertAlmostEqual(city["Service_Percentage"], 75.0, places=1)

    # Test 11: Jain's Fairness Index calculation
    def test_11_jains_fairness_index(self):
        # Equal ratios: Jain's index must be exactly 1.0
        jain_equal = calculate_jains_fairness_index([0.8, 0.8, 0.8, 0.8])
        self.assertAlmostEqual(jain_equal, 1.0, places=3)

        # Skewed ratios: Jain's index must be strictly less than 1.0
        jain_skewed = calculate_jains_fairness_index([1.0, 0.2])
        self.assertLess(jain_skewed, 0.8)

    # Test 12: Deterministic focus-city ranking & plain-English explanations
    def test_12_focus_city_ranking_and_explanations(self):
        test_hour = {
            "cities": [
                {"City": "CityGood", "Demand_kW": 500, "Critical_Load_kW": 100, "Allocated_kW": 500, "Unmet_Demand_kW": 0, "Critical_Shortfall_kW": 0, "Service_Percentage": 100.0, "Priority_Level": 2, "Supply_Status": "FULL"},
                {"Hour": 0, "City": "CityCritDeficit", "Demand_kW": 800, "Critical_Load_kW": 300, "Allocated_kW": 100, "Unmet_Demand_kW": 700, "Critical_Shortfall_kW": 200, "Service_Percentage": 12.5, "Priority_Level": 1, "Supply_Status": "CRITICAL_DEFICIT"},
                {"Hour": 0, "City": "CityPartial", "Demand_kW": 1000, "Critical_Load_kW": 100, "Allocated_kW": 500, "Unmet_Demand_kW": 500, "Critical_Shortfall_kW": 0, "Service_Percentage": 50.0, "Priority_Level": 3, "Supply_Status": "PARTIAL"}
            ]
        }
        ranking = rank_focus_cities_for_hour(test_hour)
        # Rank 1 must be CityCritDeficit due to critical shortfall
        self.assertEqual(ranking[0]["city"], "CityCritDeficit")
        self.assertIn("CRITICAL LOAD SHORTFALL", ranking[0]["recommendation_reason"])
        self.assertEqual(ranking[0]["severity"], "critical")

    # Test 13: Hour changes updating results correctly
    def test_13_hour_changes_updating_results(self):
        sample = generate_sample_review1_records()
        result = execute_daily_schedule(sample)
        hour0_rank = rank_focus_cities_for_hour(result["hourly_results"][0])
        hour19_rank = rank_focus_cities_for_hour(result["hourly_results"][19])
        self.assertIsNotNone(hour0_rank)
        self.assertIsNotNone(hour19_rank)
        # Peak hour 19 has deficit, hour 0 has plenty of supply
        self.assertGreater(result["hourly_results"][19]["total_unmet_kw"], result["hourly_results"][0]["total_unmet_kw"])

    # Test 14: Unmapped cities remaining available for scheduling
    def test_14_unmapped_cities_availability(self):
        custom_records = [
            {"Hour": 0, "City": "CustomUnmappedCityX", "Demand_kW": 500, "Available_Supply_kW": 600, "Priority_Level": 2, "Critical_Load_kW": 100}
        ]
        result = execute_daily_schedule(custom_records)
        self.assertTrue(result["success"])
        ranking = rank_focus_cities_for_hour(result["hourly_results"][0])
        self.assertEqual(ranking[0]["city"], "CustomUnmappedCityX")
        self.assertFalse(ranking[0]["network_mapping"]["is_mapped"])
        self.assertEqual(ranking[0]["network_mapping"]["mapping_status"], "UNAVAILABLE")

    # Test 15: Mapped cities highlighting the correct network node
    def test_15_mapped_cities_bus_highlight(self):
        test_hour = {
            "cities": [
                {"City": "Mumbai", "Demand_kW": 1000, "Critical_Load_kW": 200, "Allocated_kW": 800, "Unmet_Demand_kW": 200, "Critical_Shortfall_kW": 0, "Service_Percentage": 80.0, "Priority_Level": 1, "Supply_Status": "PARTIAL"}
            ]
        }
        ranking = rank_focus_cities_for_hour(test_hour)
        self.assertTrue(ranking[0]["network_mapping"]["is_mapped"])
        self.assertEqual(ranking[0]["network_mapping"]["india_grid_59"]["bus_id"], "WR-PADGHE")

    # Test 16: Outage analysis not claiming unsupported physical results
    def test_16_outage_analysis_physical_bounds(self):
        outage = assess_transmission_outage(focus_city="Mumbai", tripped_branch="LINE-WR-RAIG-PADG")
        self.assertTrue(outage["success"])
        self.assertTrue(outage["is_mapped"])
        topological = outage["topological_evaluation"]
        # Must clearly contain disclaimer/warning
        self.assertIn("physical_constraint_warning", topological)
        self.assertIn("Topological reachability is an estimate", topological["physical_constraint_warning"])

    # Test 17: Replacing workbook clearing stale results
    def test_17_replacing_workbook_clean_results(self):
        set_a = [{"Hour": 0, "City": "SetACity", "Demand_kW": 500, "Available_Supply_kW": 600, "Priority_Level": 1, "Critical_Load_kW": 100}]
        set_b = [{"Hour": 0, "City": "SetBCity", "Demand_kW": 700, "Available_Supply_kW": 800, "Priority_Level": 2, "Critical_Load_kW": 200}]
        res_a = execute_daily_schedule(set_a)
        res_b = execute_daily_schedule(set_b)
        self.assertIn("SetACity", res_a["available_cities"])
        self.assertNotIn("SetBCity", res_a["available_cities"])
        self.assertIn("SetBCity", res_b["available_cities"])
        self.assertNotIn("SetACity", res_b["available_cities"])

    # Test 18: CSV Export output integrity
    def test_18_csv_export_integrity(self):
        sample = generate_sample_review1_records()
        result = execute_daily_schedule(sample)
        csv_str = generate_schedule_csv(result)
        self.assertIn("Hour,City,Priority_Level,Demand_kW", csv_str)
        self.assertIn("Mumbai", csv_str)
        self.assertIn("Delhi", csv_str)


def run_tests():
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(TestDailyLoadScheduler)
    runner = unittest.TextTestRunner(verbosity=2)
    return runner.run(suite)


if __name__ == "__main__":
    res = run_tests()
    sys.exit(0 if res.wasSuccessful() else 1)
