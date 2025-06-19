
import xml.etree.ElementTree as ET
from typing import List, Dict, Any

def compare_xml(source_content: str, target_content: str, ignore_keys: List[str], strict: bool) -> Dict[str, Any]:
    try:
        source_root = ET.fromstring(source_content)
        target_root = ET.fromstring(target_content)
        
        # Convert XML to dict for comparison
        source_dict = xml_to_dict(source_root)
        target_dict = xml_to_dict(target_root)
        
        # Simple comparison logic for XML
        changes = compare_xml_dicts(source_dict, target_dict, ignore_keys)
        
        # Process the diff to create formatted output
        formatted_diff = create_formatted_xml_diff(source_content, target_content, changes)
        
        # Create summary
        summary = {
            "additions": sum(1 for change in changes if change['change_type'] == 'addition'),
            "deletions": sum(1 for change in changes if change['change_type'] == 'deletion'),
            "modifications": sum(1 for change in changes if change['change_type'] == 'modification')
        }
        
        return {
            "summary": summary,
            "diff": changes,
            "formatted_diff": formatted_diff
        }
        
    except Exception as e:
        raise Exception(f"XML comparison failed: {str(e)}")

def xml_to_dict(element):
    """Convert XML element to dictionary"""
    result = {}
    if element.text and element.text.strip():
        result['text'] = element.text.strip()
    
    for child in element:
        child_data = xml_to_dict(child)
        if child.tag in result:
            if not isinstance(result[child.tag], list):
                result[child.tag] = [result[child.tag]]
            result[child.tag].append(child_data)
        else:
            result[child.tag] = child_data
    
    return result

def compare_xml_dicts(source_dict, target_dict, ignore_keys, path="root"):
    """Compare two XML dictionaries and return changes"""
    changes = []
    
    # Check for additions and modifications
    for key, value in target_dict.items():
        if key in ignore_keys:
            continue
            
        current_path = f"{path}.{key}"
        
        if key not in source_dict:
            changes.append({
                "path": current_path,
                "change_type": "addition",
                "new_value": value
            })
        elif source_dict[key] != value:
            if isinstance(value, dict) and isinstance(source_dict[key], dict):
                changes.extend(compare_xml_dicts(source_dict[key], value, ignore_keys, current_path))
            else:
                changes.append({
                    "path": current_path,
                    "change_type": "modification",
                    "old_value": source_dict[key],
                    "new_value": value
                })
    
    # Check for deletions
    for key, value in source_dict.items():
        if key in ignore_keys:
            continue
            
        current_path = f"{path}.{key}"
        
        if key not in target_dict:
            changes.append({
                "path": current_path,
                "change_type": "deletion",
                "old_value": value
            })
    
    return changes

def create_formatted_xml_diff(source_content: str, target_content: str, changes: List[Dict]) -> Dict[str, List[str]]:
    source_lines = source_content.split('\n')
    target_lines = target_content.split('\n')
    
    # Simple diff marking for XML
    source_formatted = []
    target_formatted = []
    
    for line in source_lines:
        has_deletion = any(change['change_type'] == 'deletion' and 
                          any(part in line for part in change['path'].split('.')) 
                          for change in changes)
        has_modification = any(change['change_type'] == 'modification' and 
                              any(part in line for part in change['path'].split('.')) 
                              for change in changes)
        
        if has_deletion:
            source_formatted.append(f"- {line}")
        elif has_modification:
            source_formatted.append(f"~ {line}")
        else:
            source_formatted.append(f"  {line}")
    
    for line in target_lines:
        has_addition = any(change['change_type'] == 'addition' and 
                          any(part in line for part in change['path'].split('.')) 
                          for change in changes)
        has_modification = any(change['change_type'] == 'modification' and 
                              any(part in line for part in change['path'].split('.')) 
                              for change in changes)
        
        if has_addition:
            target_formatted.append(f"+ {line}")
        elif has_modification:
            target_formatted.append(f"~ {line}")
        else:
            target_formatted.append(f"  {line}")
    
    return {
        "source": source_formatted,
        "target": target_formatted
    }
