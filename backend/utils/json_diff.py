
import json
from deepdiff import DeepDiff
from typing import List, Dict, Any

def compare_json(source_content: str, target_content: str, ignore_keys: List[str], strict: bool) -> Dict[str, Any]:
    try:
        source_data = json.loads(source_content)
        target_data = json.loads(target_content)
        
        # Create deepdiff comparison
        diff = DeepDiff(
            source_data,
            target_data,
            ignore_order=not strict,
            exclude_paths=ignore_keys
        )
        
        # Process the diff to create formatted output
        formatted_diff = create_formatted_json_diff(source_content, target_content, diff)
        
        # Create summary
        summary = {
            "additions": len(diff.get('dictionary_item_added', [])) + len(diff.get('iterable_item_added', [])),
            "deletions": len(diff.get('dictionary_item_removed', [])) + len(diff.get('iterable_item_removed', [])),
            "modifications": len(diff.get('values_changed', []))
        }
        
        # Create detailed diff
        detailed_diff = []
        
        # Handle additions
        for path in diff.get('dictionary_item_added', []):
            detailed_diff.append({
                "path": path,
                "change_type": "addition",
                "new_value": diff['dictionary_item_added'][path]
            })
        
        # Handle deletions
        for path in diff.get('dictionary_item_removed', []):
            detailed_diff.append({
                "path": path,
                "change_type": "deletion",
                "old_value": diff['dictionary_item_removed'][path]
            })
        
        # Handle modifications
        for path in diff.get('values_changed', []):
            detailed_diff.append({
                "path": path,
                "change_type": "modification",
                "old_value": diff['values_changed'][path]['old_value'],
                "new_value": diff['values_changed'][path]['new_value']
            })
        
        return {
            "summary": summary,
            "diff": detailed_diff,
            "formatted_diff": formatted_diff
        }
        
    except Exception as e:
        raise Exception(f"JSON comparison failed: {str(e)}")

def create_formatted_json_diff(source_content: str, target_content: str, diff: DeepDiff) -> Dict[str, List[str]]:
    source_lines = source_content.split('\n')
    target_lines = target_content.split('\n')
    
    # For now, return the original lines with basic diff markers
    # In a real implementation, you would parse the diff and add appropriate markers
    source_formatted = []
    target_formatted = []
    
    for i, line in enumerate(source_lines):
        if any(key in line for key in diff.get('dictionary_item_removed', [])):
            source_formatted.append(f"- {line}")
        elif any(key in line for key in diff.get('values_changed', [])):
            source_formatted.append(f"~ {line}")
        else:
            source_formatted.append(f"  {line}")
    
    for i, line in enumerate(target_lines):
        if any(key in line for key in diff.get('dictionary_item_added', [])):
            target_formatted.append(f"+ {line}")
        elif any(key in line for key in diff.get('values_changed', [])):
            target_formatted.append(f"~ {line}")
        else:
            target_formatted.append(f"  {line}")
    
    return {
        "source": source_formatted,
        "target": target_formatted
    }
