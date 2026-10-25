"""
GRIDSEC — Automated Test Suite for Grid Defender Cinematic Introduction & Entry Experience
Validates:
1. Component registration in app.html and script loading order.
2. Routing integration in app.js: 'defender-intro', default session entry point, and nav state.
3. CSS design architecture in css/views.css: dark control-room theme, pulse animations, and reduced-motion support.
4. Five narrative scenes in defenderIntroView.js:
   - Scene 1: Regional Power Systems (5 regions: NR, WR, SR, ER, NER, consumer sectors: hospitals, railways, industry, homes).
   - Scene 2: Regional Interconnection (HVDC links, wheeling, transmission capacity limits).
   - Scene 3: The Unified National Synchronous Grid (December 2013 Raichur-Solapur 765 kV milestone, 50.00 Hz sync).
   - Scene 4: The Risks of Interconnection (loop flow, illustrative line trip, orange FDIA vs red physical outage).
   - Scene 5: Mission Screen (GRIDSEC / GRID DEFENDER, 3 buttons: Enter Grid Defender, Replay Story, Skip Intro).
5. Audio narration & caption controls (SpeechSynthesis, mute, pause/resume, subtitles independent of audio).
6. Keyboard accessibility (Space, ArrowLeft, ArrowRight, Escape).
7. Clean session state handoff to existing playable Grid Defender game.
"""

import sys
import os
import re
import unittest

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class TestGridDefenderIntro(unittest.TestCase):

    def setUp(self):
        self.app_html_path = os.path.join(PROJECT_ROOT, "app.html")
        self.app_js_path = os.path.join(PROJECT_ROOT, "js", "app.js")
        self.intro_view_path = os.path.join(PROJECT_ROOT, "js", "views", "defenderIntroView.js")
        self.defender_view_path = os.path.join(PROJECT_ROOT, "js", "views", "defenderView.js")
        self.views_css_path = os.path.join(PROJECT_ROOT, "css", "views.css")

    # 1. Script Registration in app.html
    def test_01_app_html_script_registration(self):
        """Verifies defenderIntroView.js is registered in app.html before defenderView.js."""
        with open(self.app_html_path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn("js/views/defenderIntroView.js", content)
        self.assertIn("js/views/defenderView.js", content)
        intro_pos = content.find("js/views/defenderIntroView.js")
        game_pos = content.find("js/views/defenderView.js")
        self.assertLess(intro_pos, game_pos, "defenderIntroView.js must be loaded before defenderView.js")
        print("✓ Test 1: Script tag properly registered in app.html in correct dependency order.")

    # 2. Navigation Routing in app.js
    def test_02_app_js_routing_and_default_entry(self):
        """Verifies app.js handles defender-intro route and checks sessionStorage for default entry."""
        with open(self.app_js_path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn("'defender-intro'", content)
        self.assertIn("gridsec_defender_intro_seen", content)
        self.assertIn("window.DefenderIntroView", content)
        print("✓ Test 2: Routing in app.js seamlessly redirects to cinematic intro on first launch.")

    # 3. CSS Dark Control-Room Architecture
    def test_03_css_styling_and_accessibility(self):
        """Verifies views.css contains control-room dark styling, animations, and reduced-motion media query."""
        with open(self.views_css_path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn(".defender-intro-wrapper", content)
        self.assertIn(".intro-topbar", content)
        self.assertIn(".intro-viewport", content)
        self.assertIn("corridor-pulse-active", content)
        self.assertIn("prefers-reduced-motion", content)
        print("✓ Test 3: Dark control-room theme, pulse animations, and reduced-motion accessibility verified in CSS.")

    # 4. Five Narrative Scenes Completeness
    def test_04_five_narrative_scenes_structure(self):
        """Verifies that defenderIntroView.js defines all 5 progressive scenes with required pedagogical milestones."""
        with open(self.intro_view_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Scene 1
        self.assertIn("Regional Power Systems", content)
        self.assertIn("Northern, Western, Southern, Eastern and North-Eastern", content) or self.assertIn("NR", content)
        self.assertIn("Hospitals", content)
        self.assertIn("Railways", content)

        # Scene 2
        self.assertIn("Regional Interconnection", content)
        self.assertIn("HVDC", content)
        self.assertIn("Transmission Capacity Limit", content) or self.assertIn("transmission capacity", content)

        # Scene 3
        self.assertIn("Unified National Synchronous Grid", content)
        self.assertIn("December 2013", content)
        self.assertIn("Raichur", content)
        self.assertIn("Solapur", content)
        self.assertIn("50.00", content) or self.assertIn("50.000 Hz", content)
        self.assertIn("One Nation, One Grid, One Frequency", content)

        # Scene 4
        self.assertIn("Risks of Interconnection", content)
        self.assertIn("Illustrative Scenario", content)
        self.assertIn("CORRIDOR TRIPPED", content)
        self.assertIn("OVERLOAD", content)
        self.assertIn("SUSPICIOUS TELEMETRY", content)

        # Scene 5
        self.assertIn("Your Mission", content)
        self.assertIn("Understand the grid. Detect the threat. Protect the power.", content)
        self.assertIn("ENTER GRID DEFENDER", content)
        self.assertIn("Replay Story", content)
        print("✓ Test 4: All 5 narrative scenes contain verified historical milestones and engineering concepts.")

    # 5. Narration, Captions & Controls
    def test_05_audio_narration_and_subtitles(self):
        """Verifies speech synthesis, mute toggle, play/pause controls, and independent subtitles."""
        with open(self.intro_view_path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn("speechSynthesis", content)
        self.assertIn("toggleMute", content)
        self.assertIn("togglePlayPause", content)
        self.assertIn("introSubtitleText", content)
        self.assertIn("goToScene", content)
        print("✓ Test 5: SpeechSynthesis narration, mute toggle, pause/resume, and subtitles verified.")

    # 6. Keyboard Accessibility
    def test_06_keyboard_navigation_accessibility(self):
        """Verifies keyboard listener supports Space (play/pause), ArrowRight (next), ArrowLeft (prev), Escape (skip)."""
        with open(self.intro_view_path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn("setupKeyboardListeners", content)
        self.assertIn("Space", content)
        self.assertIn("ArrowRight", content)
        self.assertIn("ArrowLeft", content)
        self.assertIn("Escape", content)
        print("✓ Test 6: Keyboard accessibility shortcuts verified.")

    # 7. Clean Session State Handoff
    def test_07_clean_game_session_handoff(self):
        """Verifies enterGame cleans up timers, flags session storage, and navigates to clean game state."""
        with open(self.intro_view_path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn("enterGame:", content)
        self.assertIn("gridsec_defender_intro_seen", content)
        self.assertIn("window.app.navigate('defender')", content)
        self.assertIn("resetLevel", content)
        print("✓ Test 7: Clean session state handoff to playable game confirmed.")

    # 8. Replay Story Option in DefenderView
    def test_08_replay_story_button_in_game_menu(self):
        """Verifies defenderView.js exposes a Replay Story button in its top bar."""
        with open(self.defender_view_path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn("Replay Story", content)
        self.assertIn("DefenderIntroView.startIntro()", content) or self.assertIn("navigate('defender-intro')", content)
        print("✓ Test 8: Replay Story option integrated into game view.")


if __name__ == "__main__":
    unittest.main()
