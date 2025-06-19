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

  private compareObjects(source: any, target: any, path: string, changes: ComparisonChange[]): void {
    const sourceKeys = source && typeof source === 'object' ? Object.keys(source) : [];
    const targetKeys = target && typeof target === 'object' ? Object.keys(target) : [];
    const allKeys = new Set([...sourceKeys, ...targetKeys]);

    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key;
      
      // Skip ignored keys
      if (this.ignoreKeys.has(key)) {
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
    const sourceDiff = this.addDiffMarkers(sourceLines, changes, 'source', changesByPath);
    const targetDiff = this.addDiffMarkers(targetLines, changes, 'target', changesByPath);
    
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
      return obj.map(item => `${spaces}- ${this.objectToYAML(item, 0)}`).join('\n');
    }
    
    const entries = Object.entries(obj);
    return entries.map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        return `${spaces}${key}:\n${this.objectToYAML(value, indent + 1)}`;
      } else {
        return `${spaces}${key}: ${this.objectToYAML(value, 0)}`;
      }
    }).join('\n');
  }

  private addDiffMarkers(
    lines: string[], 
    changes: ComparisonChange[], 
    side: 'source' | 'target',
    changesByPath: Map<string, ComparisonChange>
  ): string[] {
    const result: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let marker = ' '; // Default: no change
      
      // Find the change that affects this line
      const affectingChange = changes.find(change => {
        const keyFromPath = change.path.split('.').pop() || '';
        const lineContainsKey = line.includes(`"${keyFromPath}"`) || 
                               line.includes(`${keyFromPath}:`) || 
                               line.includes(`<${keyFromPath}>`);
        
        if (!lineContainsKey) return false;
        
        // Check if the line contains the relevant value
        if (side === 'source') {
          if (change.change_type === 'deletion') {
            return change.old_value !== undefined && line.includes(String(change.old_value));
          } else if (change.change_type === 'modification') {
            return change.old_value !== undefined && line.includes(String(change.old_value));
          }
        } else if (side === 'target') {
          if (change.change_type === 'addition') {
            return change.new_value !== undefined && line.includes(String(change.new_value));
          } else if (change.change_type === 'modification') {
            return change.new_value !== undefined && line.includes(String(change.new_value));
          }
        }
        
        return false;
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
}