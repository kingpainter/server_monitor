"""Test entity ID synchronization between const.py and frontend/server-monitor-shared.js."""

import ast
import re
from pathlib import Path


def extract_monitored_entities_from_python():
    """Extract MONITORED_ENTITIES tuple from const.py using AST parsing."""
    const_path = Path(__file__).parent.parent / "custom_components" / "server_monitor" / "const.py"
    content = const_path.read_text()
    
    # Parse the Python file
    tree = ast.parse(content)
    
    # Find the MONITORED_ENTITIES assignment
    for node in tree.body:
        # Handle both Assign and AnnAssign (annotated assignments like `x: Type = value`)
        target = None
        value = None
        
        if isinstance(node, ast.Assign):
            for t in node.targets:
                if isinstance(t, ast.Name) and t.id == "MONITORED_ENTITIES":
                    target = t
                    value = node.value
                    break
        elif isinstance(node, ast.AnnAssign):
            if isinstance(node.target, ast.Name) and node.target.id == "MONITORED_ENTITIES":
                target = node.target
                value = node.value
        
        if target and value:
            # Extract the tuple value
            if isinstance(value, ast.Tuple):
                entity_ids = []
                for elt in value.elts:
                    if isinstance(elt, ast.Constant) and isinstance(elt.value, str):
                        entity_ids.append(elt.value)
                return set(entity_ids)
    
    raise ValueError("Could not find MONITORED_ENTITIES in const.py")


def extract_entity_ids_from_javascript():
    """Extract all entity IDs from server-monitor-shared.js exports.
    
    Excludes HEALTH_SENSOR since it's not in the monitored list (it's the
    sensor that the coordinator exposes, not one it monitors).
    """
    js_path = Path(__file__).parent.parent / "custom_components" / "server_monitor" / "frontend" / "server-monitor-shared.js"
    content = js_path.read_text()
    
    entity_ids = set()
    
    # Extract from STATUS_ENTITIES, ENERGY_ENTITIES, SYSTEM_ENTITIES, DOCKER_AGG_ENTITIES, ACTION_ENTITIES
    # These are simple object exports with string values
    for match in re.finditer(r"'([^']+)'", content):
        candidate = match.group(1)
        # Filter to only entity IDs (they follow the pattern domain.id)
        # Exclude HEALTH_SENSOR since it's not part of MONITORED_ENTITIES
        if (candidate == 'sensor.server_monitor_entity_health'):
            continue
        if '.' in candidate and (candidate.startswith('sensor.') or 
                                 candidate.startswith('binary_sensor.') or
                                 candidate.startswith('switch.') or
                                 candidate.startswith('update.') or
                                 candidate.startswith('button.')):
            entity_ids.add(candidate)
    
    # Also extract from DRIVES, CONTAINERS, SERVICES arrays
    # These use 'eid' property
    for match in re.finditer(r"eid:\s*'([^']+)'", content):
        entity_ids.add(match.group(1))
    
    return entity_ids


def test_entity_id_sync():
    """Test that entity IDs are synchronized between const.py and server-monitor-shared.js."""
    python_entities = extract_monitored_entities_from_python()
    js_entities = extract_entity_ids_from_javascript()
    
    print(f"Python const.py: {len(python_entities)} entities")
    print(f"JavaScript shared.js: {len(js_entities)} entities (excluding HEALTH_SENSOR)")
    
    # Find differences
    only_in_python = python_entities - js_entities
    only_in_js = js_entities - python_entities
    
    # Report
    if only_in_python:
        print(f"\n❌ Only in const.py ({len(only_in_python)}):")
        for eid in sorted(only_in_python):
            print(f"  - {eid}")
    
    if only_in_js:
        print(f"\n❌ Only in shared.js ({len(only_in_js)}):")
        for eid in sorted(only_in_js):
            print(f"  - {eid}")
    
    if not only_in_python and not only_in_js:
        print("\n✅ Entity IDs are in sync!")
    
    # Assert both are empty
    assert not only_in_python, f"Found {len(only_in_python)} entities in const.py but not in shared.js"
    assert not only_in_js, f"Found {len(only_in_js)} entities in shared.js but not in const.py"


if __name__ == "__main__":
    test_entity_id_sync()
