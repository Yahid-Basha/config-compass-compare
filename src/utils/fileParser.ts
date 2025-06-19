export interface ParsedData {
  [key: string]: any;
}

export class FileParser {
  static parseJSON(content: string): ParsedData {
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Invalid JSON format: ${error.message}`);
    }
  }

  static parseXML(content: string): ParsedData {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(content, 'text/xml');
      
      // Check for parsing errors
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        throw new Error('Invalid XML format');
      }
      
      return this.xmlToObject(xmlDoc.documentElement);
    } catch (error) {
      throw new Error(`Invalid XML format: ${error.message}`);
    }
  }

  static parseYAML(content: string): ParsedData {
    try {
      // Simple YAML parser for basic structures
      const lines = content.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
      const result: ParsedData = {};
      const stack: Array<{ obj: ParsedData; indent: number }> = [{ obj: result, indent: -1 }];
      
      for (const line of lines) {
        const indent = line.length - line.trimStart().length;
        const trimmed = line.trim();
        
        if (!trimmed.includes(':')) continue;
        
        const [key, ...valueParts] = trimmed.split(':');
        const value = valueParts.join(':').trim();
        
        // Pop stack until we find the right parent
        while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
          stack.pop();
        }
        
        const parent = stack[stack.length - 1].obj;
        
        if (value === '' || value === null) {
          // This is a parent object
          parent[key.trim()] = {};
          stack.push({ obj: parent[key.trim()], indent });
        } else {
          // This is a value
          parent[key.trim()] = this.parseValue(value);
        }
      }
      
      return result;
    } catch (error) {
      throw new Error(`Invalid YAML format: ${error.message}`);
    }
  }

  private static xmlToObject(element: Element): ParsedData {
    const result: ParsedData = {};
    
    // Handle attributes
    if (element.attributes.length > 0) {
      result['@attributes'] = {};
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        result['@attributes'][attr.name] = attr.value;
      }
    }
    
    // Handle child elements
    const children = Array.from(element.children);
    if (children.length === 0) {
      // Leaf node
      const textContent = element.textContent?.trim();
      if (textContent) {
        return this.parseValue(textContent);
      }
      return result;
    }
    
    for (const child of children) {
      const childName = child.tagName;
      const childValue = this.xmlToObject(child);
      
      if (result[childName]) {
        // Multiple elements with same name - convert to array
        if (!Array.isArray(result[childName])) {
          result[childName] = [result[childName]];
        }
        result[childName].push(childValue);
      } else {
        result[childName] = childValue;
      }
    }
    
    return result;
  }

  private static parseValue(value: string): any {
    const trimmed = value.trim();
    
    // Boolean values
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    
    // Null values
    if (trimmed === 'null' || trimmed === '~') return null;
    
    // Number values
    if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10);
    if (/^-?\d*\.\d+$/.test(trimmed)) return parseFloat(trimmed);
    
    // String values (remove quotes if present)
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }
    
    return trimmed;
  }

  static parse(content: string, format: 'json' | 'xml' | 'yaml'): ParsedData {
    switch (format) {
      case 'json':
        return this.parseJSON(content);
      case 'xml':
        return this.parseXML(content);
      case 'yaml':
        return this.parseYAML(content);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }
}