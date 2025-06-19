import { ParsedData } from './fileParser';

export interface ComparisonChange {
  path: string;
  change_type: 'addition' | 'deletion' | 'modification';
  old_value?: any;
  new_value?: any;
}

export interface ComparisonSummary {
  additions: number;
  deletions: number;
  modifications: number;
}

export interface ComparisonResult {
  summary: ComparisonSummary;
  diff: ComparisonChange[];
  formatted_diff: {
    source: string[];
    target: string[];
  };
}

export class FileComparator {
  private ignoreKeys: Set<string>;
  private strictMode: boolean;

  constructor(ignoreKeys: string[] = [], strictMode: boolean = true) {
    this.ignoreKeys = new Set(ignoreKeys.map(key => key.trim()).filter(Boolean));
    this.strictMode = strictMode;
  }

  compare(sourceData: ParsedData, targetData: ParsedData, format: 'json' | 'xml' | 'yaml'): ComparisonResult {
    const changes: ComparisonChange[] = [];
    
    // Compare objects recursively
    this.compareObjects(sourceData, targetData, '', changes);
    
    // Generate summary
    const summary = this.generateSummary(changes);
    
    // Generate formatted diff
    const formatted_diff = this.generateFormattedDiff(sourceData, targetData, changes, format);
    
    return {
      summary,
      diff: changes,
      formatted_diff
    };
  }

  private shouldIgnoreKey(path: string, key: string): boolean {
    // Check if the key itself should be ignored
    if (this.ignoreKeys.has(key)) {
      return true;
    }
    
    // Check if any part of the path should be ignored
    const pathParts = path.split('.');
    for (const part of pathParts) {
      if (this.ignoreKeys.has(part)) {
        return true;
      }
    }
    
    // Check if the full path should be ignored
    const fullPath = path ? `${path}.${key}` : key;
    if (this.ignoreKeys.has(fullPath)) {
      return true;
    }
    
    return false;
  }

  private compareObjects(source: any, target: any, path: string, changes: ComparisonChange[]): void {
    // Handle arrays specially
    if (Array.isArray(source) || Array.isArray(target)) {
      this.compareArrays(source, target, path, changes);
      return;
    }

    const sourceKeys = source && typeof source === 'object' ? Object.keys(source) : [];
    const targetKeys = target && typeof target === 'object' ? Object.keys(target) : [];
    const allKeys = new Set([...sourceKeys, ...targetKeys]);

    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key;
      
      // Skip ignored keys using improved logic
      if (this.shouldIgnoreKey(path, key)) {
        console.log(`Ignoring key: ${key} at path: ${path}`);
        continue;
      }

      const sourceValue = source?.[key];
      const targetValue = target?.[key];

      if (sourceValue === undefined && targetValue !== undefined) {
        // Addition
        changes.push({
          path: currentPath,
          change_type: 'addition',
          new_value: targetValue
        });
      } else if (sourceValue !== undefined && targetValue === undefined) {
        // Deletion
        changes.push({
          path: currentPath,
          change_type: 'deletion',
          old_value: sourceValue
        });
      } else if (sourceValue !== undefined && targetValue !== undefined) {
        // Potential modification
        if (this.valuesEqual(sourceValue, targetValue)) {
          // Values are equal, continue with nested comparison if objects
          if (typeof sourceValue === 'object' && typeof targetValue === 'object' && 
              sourceValue !== null && targetValue !== null) {
            this.compareObjects(sourceValue, targetValue, currentPath, changes);
          }
        } else {
          // Values are different
          if (typeof sourceValue === 'object' && typeof targetValue === 'object' && 
              sourceValue !== null && targetValue !== null) {
            // Both are objects, compare recursively
            this.compareObjects(sourceValue, targetValue, currentPath, changes);
          } else {
            // Different primitive values - this is a modification
            changes.push({
              path: currentPath,
              change_type: 'modification',
              old_value: sourceValue,
              new_value: targetValue
            });
          }
        }
      }
    }
  }

  private compareArrays(source: any[], target: any[], path: string, changes: ComparisonChange[]): void {
    const sourceArray = Array.isArray(source) ? source : [];
    const targetArray = Array.isArray(target) ? target : [];
    
    const maxLength = Math.max(sourceArray.length, targetArray.length);
    
    for (let i = 0; i < maxLength; i++) {
      const currentPath = `${path}[${i}]`;
      const sourceItem = sourceArray[i];
      const targetItem = targetArray[i];
      
      if (sourceItem === undefined && targetItem !== undefined) {
        // Addition
        changes.push({
          path: currentPath,
          change_type: 'addition',
          new_value: targetItem
        });
      } else if (sourceItem !== undefined && targetItem === undefined) {
        // Deletion
        changes.push({
          path: currentPath,
          change_type: 'deletion',
          old_value: sourceItem
        });
      } else if (sourceItem !== undefined && targetItem !== undefined) {
        if (!this.valuesEqual(sourceItem, targetItem)) {
          if (typeof sourceItem === 'object' && typeof targetItem === 'object' && 
              sourceItem !== null && targetItem !== null) {
            // Compare objects recursively
            this.compareObjects(sourceItem, targetItem, currentPath, changes);
          } else {
            // Different primitive values
            changes.push({
              path: currentPath,
              change_type: 'modification',
              old_value: sourceItem,
              new_value: targetItem
            });
          }
        }
      }
    }
  }

  private valuesEqual(a: any, b: any): boolean {
    if (this.strictMode) {
      return JSON.stringify(a) === JSON.stringify(b);
    } else {
      // Lenient comparison
      if (typeof a !== typeof b) return false;
      if (a === null || b === null) return a === b;
      if (typeof a === 'object') {
        return JSON.stringify(a) === JSON.stringify(b);
      }
      return String(a).trim() === String(b).trim();
    }
  }

  private generateSummary(changes: ComparisonChange[]): ComparisonSummary {
    return {
      additions: changes.filter(c => c.change_type === 'addition').length,
      deletions: changes.filter(c => c.change_type === 'deletion').length,
      modifications: changes.filter(c => c.change_type === 'modification').length
    };
  }

  private generateFormattedDiff(
    sourceData: ParsedData, 
    targetData: ParsedData, 
    changes: ComparisonChange[], 
    format: 'json' | 'xml' | 'yaml'
  ): { source: string[]; target: string[] } {
    // Convert data back to formatted strings
    const sourceLines = this.formatData(sourceData, format).split('\n');
    const targetLines = this.formatData(targetData, format).split('\n');
    
    // Create change maps for quick lookup
    const changesByPath = new Map<string, ComparisonChange>();
    changes.forEach(change => {
      changesByPath.set(change.path, change);
    });
    
    // Add diff markers with proper modification handling
    const sourceDiff = this.addDiffMarkers(sourceLines, changes, 'source', changesByPath, format);
    const targetDiff = this.addDiffMarkers(targetLines, changes, 'target', changesByPath, format);
    
    return {
      source: sourceDiff,
      target: targetDiff
    };
  }

  private formatData(data: ParsedData, format: 'json' | 'xml' | 'yaml'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'xml':
        return this.objectToXML(data);
      case 'yaml':
        return this.objectToYAML(data);
      default:
        return JSON.stringify(data, null, 2);
    }
  }

  private objectToXML(obj: any, rootName: string = 'root', indent: number = 0): string {
    const spaces = '  '.repeat(indent);
    
    if (typeof obj !== 'object' || obj === null) {
      return `${spaces}<${rootName}>${obj}</${rootName}>`;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.objectToXML(item, rootName, indent)).join('\n');
    }
    
    let xml = `${spaces}<${rootName}>`;
    const entries = Object.entries(obj);
    
    if (entries.length > 0) {
      xml += '\n';
      for (const [key, value] of entries) {
        if (key === '@attributes') continue; // Skip attributes for simplicity
        xml += this.objectToXML(value, key, indent + 1) + '\n';
      }
      xml += spaces;
    }
    
    xml += `</${rootName}>`;
    return xml;
  }

  private objectToYAML(obj: any, indent: number = 0): string {
    const spaces = '  '.repeat(indent);
    
    if (typeof obj !== 'object' || obj === null) {
      return String(obj);
    }
    
    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        return '[]';
      }
      return obj.map(item => {
        if (typeof item === 'object' && item !== null) {
          const itemYaml = this.objectToYAML(item, indent + 1);
          return `${spaces}- ${itemYaml.replace(/^\s+/, '')}`;
        } else {
          return `${spaces}- ${this.objectToYAML(item, 0)}`;
        }
      }).join('\n');
    }
    
    const entries = Object.entries(obj);
    return entries.map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          if (value.length === 0) {
            return `${spaces}${key}: []`;
          }
          const arrayYaml = this.objectToYAML(value, indent + 1);
          return `${spaces}${key}:\n${arrayYaml}`;
        } else {
          const objectYaml = this.objectToYAML(value, indent + 1);
          return `${spaces}${key}:\n${objectYaml}`;
        }
      } else {
        return `${spaces}${key}: ${this.objectToYAML(value, 0)}`;
      }
    }).join('\n');
  }

  private addDiffMarkers(
    lines: string[], 
    changes: ComparisonChange[], 
    side: 'source' | 'target',
    changesByPath: Map<string, ComparisonChange>,
    format: 'json' | 'xml' | 'yaml'
  ): string[] {
    const result: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let marker = ' '; // Default: no change
      
      // Find the change that affects this line
      const affectingChange = changes.find(change => {
        return this.lineMatchesChange(line, change, side, format);
      });
      
      if (affectingChange) {
        if (affectingChange.change_type === 'addition' && side === 'target') {
          marker = '+';
        } else if (affectingChange.change_type === 'deletion' && side === 'source') {
          marker = '-';
        } else if (affectingChange.change_type === 'modification') {
          // Use special marker for modifications
          marker = '~';
        }
      }
      
      result.push(marker + line);
    }
    
    return result;
  }

  private lineMatchesChange(line: string, change: ComparisonChange, side: 'source' | 'target', format: 'json' | 'xml' | 'yaml'): boolean {
    const pathParts = change.path.split('.');
    const lastKey = pathParts[pathParts.length - 1];
    
    // Handle array indices
    const arrayMatch = lastKey.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, arrayKey, index] = arrayMatch;
      
      if (format === 'yaml') {
        // For YAML arrays, look for the array key and the item
        if (line.includes(`${arrayKey}:`)) {
          return true;
        }
        // Check if this is an array item line
        if (line.trim().startsWith('- ')) {
          const value = side === 'source' ? change.old_value : change.new_value;
          if (value !== undefined && line.includes(String(value))) {
            return true;
          }
        }
      } else if (format === 'json') {
        // For JSON arrays, look for the value in the line
        const value = side === 'source' ? change.old_value : change.new_value;
        if (value !== undefined && line.includes(String(value))) {
          return true;
        }
      }
      return false;
    }
    
    // Regular key matching
    const keyFromPath = lastKey || '';
    let lineContainsKey = false;
    
    if (format === 'json') {
      lineContainsKey = line.includes(`"${keyFromPath}"`);
    } else if (format === 'yaml') {
      lineContainsKey = line.includes(`${keyFromPath}:`);
    } else if (format === 'xml') {
      lineContainsKey = line.includes(`<${keyFromPath}>`);
    }
    
    if (!lineContainsKey) return false;
    
    // Check if the line contains the relevant value
    const value = side === 'source' ? change.old_value : change.new_value;
    if (value !== undefined) {
      return line.includes(String(value));
    }
    
    return true;
  }
}