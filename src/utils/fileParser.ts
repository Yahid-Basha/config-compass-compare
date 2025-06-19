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
      // Enhanced YAML parser for better array and object handling
      const lines = content.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
      const result: ParsedData = {};
      const stack: Array<{ obj: ParsedData | any[], indent: number, isArray: boolean }> = [
        { obj: result, indent: -1, isArray: false }
      ];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const indent = line.length - line.trimStart().length;
        const trimmed = line.trim();
        
        // Handle array items
        if (trimmed.startsWith('- ')) {
          const value = trimmed.substring(2).trim();
          
          // Pop stack until we find the right parent
          while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
            stack.pop();
          }
          
          const parent = stack[stack.length - 1];
          
          if (!Array.isArray(parent.obj)) {
            // Convert to array if needed
            const lastKey = this.getLastKey(stack);
            if (lastKey && typeof parent.obj === 'object') {
              parent.obj[lastKey] = [];
              stack.push({ obj: parent.obj[lastKey], indent, isArray: true });
            }
          }
          
          const currentArray = stack[stack.length - 1].obj as any[];
          
          if (value.includes(':')) {
            // This is an object item in the array
            const itemObj = {};
            currentArray.push(itemObj);
            
            const [key, ...valueParts] = value.split(':');
            const itemValue = valueParts.join(':').trim();
            
            if (itemValue) {
              itemObj[key.trim()] = this.parseValue(itemValue);
            } else {
              // Multi-line object in array
              stack.push({ obj: itemObj, indent: indent + 2, isArray: false });
            }
          } else {
            // Simple array item
            currentArray.push(this.parseValue(value));
          }
          continue;
        }
        
        // Handle key-value pairs
        if (trimmed.includes(':')) {
          const [key, ...valueParts] = trimmed.split(':');
          const value = valueParts.join(':').trim();
          
          // Pop stack until we find the right parent
          while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
            stack.pop();
          }
          
          const parent = stack[stack.length - 1];
          const parentObj = Array.isArray(parent.obj) ? parent.obj[parent.obj.length - 1] : parent.obj;
          
          if (value === '' || value === null) {
            // Check if next line is an array
            const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
            const nextIndent = nextLine.length - nextLine.trimStart().length;
            const nextTrimmed = nextLine.trim();
            
            if (nextTrimmed.startsWith('- ')) {
              // This is an array
              parentObj[key.trim()] = [];
              stack.push({ obj: parentObj[key.trim()], indent, isArray: true });
            } else {
              // This is a parent object
              parentObj[key.trim()] = {};
              stack.push({ obj: parentObj[key.trim()], indent, isArray: false });
            }
          } else {
            // This is a value
            parentObj[key.trim()] = this.parseValue(value);
          }
        }
      }
      
      return result;
    } catch (error) {
      throw new Error(`Invalid YAML format: ${error.message}`);
    }
  }

  private static getLastKey(stack: Array<{ obj: ParsedData | any[], indent: number, isArray: boolean }>): string | null {
    // Find the last key that was added to create the current context
    for (let i = stack.length - 2; i >= 0; i--) {
      const parent = stack[i];
      const current = stack[i + 1];
      
      if (typeof parent.obj === 'object' && !Array.isArray(parent.obj)) {
        const keys = Object.keys(parent.obj);
        for (const key of keys) {
          if (parent.obj[key] === current.obj) {
            return key;
          }
        }
      }
    }
    return null;
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