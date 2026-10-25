"""
GRIDSEC — Character Integration & Verification Test Suite
Validates the complete character-driven gameplay, asset integration,
contextual dialogue logic, and DSA algorithm couplings.
"""

import sys
import os
import re
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent
project_root = backend_dir.parent
sys.path.insert(0, str(backend_dir))

def run_tests():
    print("=" * 70)
    print("  GRIDSEC — CHARACTER INTEGRATION VERIFICATION TEST SUITE")
    print("=" * 70)

    passed = 0
    total = 0

    def assert_test(condition, test_name, details=""):
        nonlocal passed, total
        total += 1
        if condition:
            passed += 1
            print(f"  [PASS] {test_name}")
            if details:
                print(f"         {details}")
        else:
            print(f"  [FAIL] {test_name}")
            if details:
                print(f"         {details}")

    # TEST 1: Original User-Uploaded Character Assets Exist
    op_path = Path(r"C:\Users\karti\.gemini\antigravity-ide\brain\d2622f27-4d61-406f-933f-22fef3b2aff9\.user_uploaded\media_1792763553226.png")
    hk_path = Path(r"C:\Users\karti\.gemini\antigravity-ide\brain\d2622f27-4d61-406f-933f-22fef3b2aff9\.user_uploaded\media_1792763583932.png")
    
    assert_test(op_path.exists(), "Operator original asset exists", f"Path: {op_path} (Size: {op_path.stat().st_size if op_path.exists() else 0} bytes)")
    assert_test(hk_path.exists(), "Hacker original asset exists", f"Path: {hk_path} (Size: {hk_path.stat().st_size if hk_path.exists() else 0} bytes)")

    # TEST 2: Sync Character Assets to Project Directory
    import shutil
    dest_dir = project_root / "assets" / "images"
    dest_dir.mkdir(parents=True, exist_ok=True)
    if op_path.exists() and not (dest_dir / "grid_operator.png").exists():
        shutil.copy(op_path, dest_dir / "grid_operator.png")
    if hk_path.exists() and not (dest_dir / "hacker.png").exists():
        shutil.copy(hk_path, dest_dir / "hacker.png")

    assert_test((dest_dir / "grid_operator.png").exists(), "Synced grid_operator.png in assets/images", f"Size: {(dest_dir / 'grid_operator.png').stat().st_size} bytes")
    assert_test((dest_dir / "hacker.png").exists(), "Synced hacker.png in assets/images", f"Size: {(dest_dir / 'hacker.png').stat().st_size} bytes")

    # TEST 3: Backend Endpoint in main.py
    main_py_path = backend_dir / "app" / "main.py"
    with open(main_py_path, "r", encoding="utf-8") as f:
        main_content = f.read()

    assert_test("/api/character-image/{character_id}" in main_content, "API endpoint /api/character-image/{character_id} defined in main.py")
    assert_test("def get_character_image" in main_content, "get_character_image handler implemented in main.py")
    assert_test("_sync_character_images" in main_content, "Auto-sync logic registered in main.py")

    # TEST 4: characterDialogue.js Engine Implementation
    char_dialogue_path = project_root / "js" / "engine" / "characterDialogue.js"
    assert_test(char_dialogue_path.exists(), "characterDialogue.js exists in js/engine/")
    with open(char_dialogue_path, "r", encoding="utf-8") as f:
        cd_content = f.read()

    assert_test("window.CHARACTER_ASSETS" in cd_content, "CHARACTER_ASSETS exported with OPERATOR and HACKER metadata")
    assert_test("window.getCharacterImgHtml" in cd_content, "window.getCharacterImgHtml implemented with multi-tier onerror fallback")
    assert_test("window.CharacterDialogueEngine" in cd_content, "CharacterDialogueEngine declared")
    assert_test("getContextualDialogue" in cd_content, "getContextualDialogue method implemented")

    # Verify DSA Algorithm Dialouge Handlers in characterDialogue.js
    dsa_algos = ['BFS', 'DFS', 'DIJKSTRA', 'TARJAN', 'MAX_HEAP', 'DSU_ISLANDS', 'AC_FEASIBILITY']
    for algo in dsa_algos:
        assert_test(f"algo === '{algo}'" in cd_content, f"Dialogue engine reacts to {algo} execution")

    # Verify Cyber Attack & Penalty Reactions
    assert_test("UNNECESSARY_SWITCHING" in cd_content, "Adversary gloats over false data injection trap (unnecessary line switching)")
    assert_test("AVOIDABLE_CASCADE_OUTAGE" in cd_content, "Adversary gloats over unverified reroute cascade outage")
    assert_test("Chi-Square residual" in cd_content, "State estimation Chi-Square residual test J(x) referenced in FDIA detection")

    # TEST 5: Cinematic Introduction Integration in defenderIntroView.js
    intro_path = project_root / "js" / "views" / "defenderIntroView.js"
    with open(intro_path, "r", encoding="utf-8") as f:
        intro_content = f.read()

    assert_test("renderCharacterStage" in intro_content, "renderCharacterStage method implemented in defenderIntroView.js")
    assert_test("Before we defend the grid, we need to understand it" in intro_content, "Scene 1 features Grid Operator dialogue")
    assert_test("An interconnected grid is powerful. But what happens when an important connection fails" in intro_content, "Scene 4 features Cyber Adversary dialogue")
    assert_test("GRID DEFENDER" in intro_content and "ENTER GRID DEFENDER" in intro_content, "Scene 5 features Grid Defender mission call-to-action")
    assert_test("Skip Intro" in intro_content, "Skip Intro button is provided")
    assert_test("Replay Story" in intro_content, "Replay Story option is provided")

    # TEST 6: In-Game Character Presentation in defenderView.js
    def_path = project_root / "js" / "views" / "defenderView.js"
    with open(def_path, "r", encoding="utf-8") as f:
        def_content = f.read()

    assert_test("defenderCharacterDialogueContainer" in def_content, "#defenderCharacterDialogueContainer mounted in right column")
    assert_test("renderCharacterDialogue" in def_content, "renderCharacterDialogue implemented on DefenderView")
    assert_test("toggleDialogueCollapse" in def_content, "Collapsible dialogue supported via toggleDialogueCollapse")
    assert_test("toggleDialogueMute" in def_content, "Repeat player dialogue mute supported via toggleDialogueMute")
    assert_test("askOperatorAdvice" in def_content, "Manual mentor consultation supported via askOperatorAdvice")
    assert_test("openLayer3TechnicalDetails" in def_content, "Technical details trigger implemented via openLayer3TechnicalDetails")

    # Verify DSA Algorithm Actions Reset forcedSpeaker to Deliver Fresh Dynamic Reaction
    actions_to_check = [
        "actionRunBFS", "actionRunDFS", "actionRunDijkstra",
        "actionRunMaxHeap", "actionRunTarjan", "actionRunDSU",
        "actionAuditFeasibility", "actionOperatingAdjustment",
        "actionRecovery", "actionTargetedResponse", "actionUnnecessarySwitchingTrip"
    ]
    for act in actions_to_check:
        pattern = rf"{act}:\s*function\([^)]*\)\s*\{{[^}}]*s\.forcedSpeaker\s*=\s*null;"
        assert_test(bool(re.search(pattern, def_content)), f"{act} resets forcedSpeaker for authentic contextual reaction")

    # TEST 7: App HTML Script Registration
    app_html_path = project_root / "app.html"
    with open(app_html_path, "r", encoding="utf-8") as f:
        app_html = f.read()

    assert_test('<script src="js/engine/characterDialogue.js"></script>' in app_html, "characterDialogue.js registered in app.html")
    # Verify order: characterDialogue.js before defenderIntroView.js and defenderView.js
    cd_idx = app_html.find("characterDialogue.js")
    intro_idx = app_html.find("defenderIntroView.js")
    def_idx = app_html.find("defenderView.js")
    assert_test(cd_idx < intro_idx and cd_idx < def_idx, "characterDialogue.js loads before defender views")

    # TEST 8: CSS Styling Rules in views.css
    views_css_path = project_root / "css" / "views.css"
    with open(views_css_path, "r", encoding="utf-8") as f:
        views_css = f.read()

    assert_test(".character-dialogue-box" in views_css, ".character-dialogue-box defined in views.css")
    assert_test(".character-dialogue-box.operator-mode" in views_css, "operator-mode styling defined")
    assert_test(".character-dialogue-box.hacker-mode" in views_css, "hacker-mode styling defined")
    assert_test(".character-avatar-container.operator-frame" in views_css, "operator-frame preserves engineer proportions")
    assert_test(".character-avatar-container.hacker-frame" in views_css, "hacker-frame provides dark glowing background for transparent cutout")
    assert_test(".character-dialogue-collapsed" in views_css, "character-dialogue-collapsed styling defined")
    assert_test(".intro-character-stage" in views_css, ".intro-character-stage defined in views.css")

    print("=" * 70)
    print(f"  TEST RESULTS: {passed} / {total} Passed ({passed/total*100:.1f}%)")
    print("=" * 70)
    return passed == total

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
