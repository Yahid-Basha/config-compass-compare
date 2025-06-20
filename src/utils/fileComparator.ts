import { ParsedData } from "./fileParser";

export interface ComparisonChange {
  path: string;
  change_type: "addition" | "deletion" | "modification";
  old_value?: any;
  new_value?: any;
  is_array_item?: boolean;
  parent_key?: string;
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
    this.ignoreKeys = new Set(
      ignoreKeys.map((key) => key.trim()).filter(Boolean)
    );
    this.strictMode = strictMode;
  }

  compare(
    sourceData: ParsedData,
    targetData: ParsedData,
    format: "json" | "xml" | "yaml"
  ): ComparisonResult {
    const changes: ComparisonChange[] = [];

    // Compare objects recursively
    this.compareObjects(sourceData, targetData, "", changes);

    // Generate summary
    const summary = this.generateSummary(changes);

    // Generate formatted diff
    const formatted_diff = this.generateFormattedDiff(
      sourceData,
      targetData,
      changes,
      format
    );

    return {
      summary,
      diff: changes,
      formatted_diff,
    };
  }

  private shouldIgnoreKey(path: string, key: string): boolean {
    // Check if the key itself should be ignored
    if (this.ignoreKeys.has(key)) {
      return true;
    }

    // Check if any part of the path should be ignored
    const pathParts = path.split(".");
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

  private compareObjects(
    source: any,
    target: any,
    path: string,
    changes: ComparisonChange[]
  ): void {
    // Handle arrays specially
    if (Array.isArray(source) || Array.isArray(target)) {
      this.compareArrays(source, target, path, changes);
      return;
    }

    const sourceKeys =
      source && typeof source === "object" ? Object.keys(source) : [];
    const targetKeys =
      target && typeof target === "object" ? Object.keys(target) : [];
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
          change_type: "addition",
          new_value: targetValue,
        });
      } else if (sourceValue !== undefined && targetValue === undefined) {
        // Deletion
        changes.push({
          path: currentPath,
          change_type: "deletion",
          old_value: sourceValue,
        });
      } else if (sourceValue !== undefined && targetValue !== undefined) {
        // Potential modification
        if (this.valuesEqual(sourceValue, targetValue)) {
          // Values are equal, continue with nested comparison if objects
          if (
            typeof sourceValue === "object" &&
            typeof targetValue === "object" &&
            sourceValue !== null &&
            targetValue !== null
          ) {
            this.compareObjects(sourceValue, targetValue, currentPath, changes);
          }
        } else {
          // Values are different
          if (
            typeof sourceValue === "object" &&
            typeof targetValue === "object" &&
            sourceValue !== null &&
            targetValue !== null
          ) {
            // Both are objects, compare recursively
            this.compareObjects(sourceValue, targetValue, currentPath, changes);
          } else {
            // Different primitive values - this is a modification
            changes.push({
              path: currentPath,
              change_type: "modification",
              old_value: sourceValue,
              new_value: targetValue,
            });
          }
        }
      }
    }
  }

  private compareArrays(
    source: any[],
    target: any[],
    path: string,
    changes: ComparisonChange[]
  ): void {
    const sourceArray = Array.isArray(source) ? source : [];
    const targetArray = Array.isArray(target) ? target : [];

    const maxLength = Math.max(sourceArray.length, targetArray.length);

    // Extract parent key from path for array item tracking
    const pathParts = path.split(".");
    const parentKey = pathParts[pathParts.length - 1];

    for (let i = 0; i < maxLength; i++) {
      const currentPath = `${path}[${i}]`;
      const sourceItem = sourceArray[i];
      const targetItem = targetArray[i];

      if (sourceItem === undefined && targetItem !== undefined) {
        // Addition
        changes.push({
          path: currentPath,
          change_type: "addition",
          new_value: targetItem,
          is_array_item: true,
          parent_key: parentKey,
        });
      } else if (sourceItem !== undefined && targetItem === undefined) {
        // Deletion
        changes.push({
          path: currentPath,
          change_type: "deletion",
          old_value: sourceItem,
          is_array_item: true,
          parent_key: parentKey,
        });
      } else if (sourceItem !== undefined && targetItem !== undefined) {
        if (!this.valuesEqual(sourceItem, targetItem)) {
          if (
            typeof sourceItem === "object" &&
            typeof targetItem === "object" &&
            sourceItem !== null &&
            targetItem !== null
          ) {
            // Compare objects recursively
            this.compareObjects(sourceItem, targetItem, currentPath, changes);
          } else {
            // Different primitive values
            changes.push({
              path: currentPath,
              change_type: "modification",
              old_value: sourceItem,
              new_value: targetItem,
              is_array_item: true,
              parent_key: parentKey,
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
      // Enhanced lenient comparison for XML
      if (typeof a !== typeof b) return false;
      if (a === null || b === null) return a === b;
      if (typeof a === "object") {
        // For objects, still use JSON comparison but normalize strings
        const normalizeObj = (obj: any): any => {
          if (typeof obj === "string") {
            return obj.trim().toLowerCase();
          }
          if (Array.isArray(obj)) {
            return obj.map(normalizeObj);
          }
          if (typeof obj === "object" && obj !== null) {
            const normalized: any = {};
            for (const key in obj) {
              normalized[key] = normalizeObj(obj[key]);
            }
            return normalized;
          }
          return obj;
        };
        return (
          JSON.stringify(normalizeObj(a)) === JSON.stringify(normalizeObj(b))
        );
      }
      // For primitive values, normalize and compare
      return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
    }
  }

  private generateSummary(changes: ComparisonChange[]): ComparisonSummary {
    return {
      additions: changes.filter((c) => c.change_type === "addition").length,
      deletions: changes.filter((c) => c.change_type === "deletion").length,
      modifications: changes.filter((c) => c.change_type === "modification")
        .length,
    };
  }

  private generateFormattedDiff(
    sourceData: ParsedData,
    targetData: ParsedData,
    changes: ComparisonChange[],
    format: "json" | "xml" | "yaml"
  ): { source: string[]; target: string[] } {
    // Convert data back to formatted strings
    const sourceLines = this.formatData(sourceData, format).split("\n");
    const targetLines = this.formatData(targetData, format).split("\n");

    // Create change maps for quick lookup
    const changesByPath = new Map<string, ComparisonChange>();
    changes.forEach((change) => {
      changesByPath.set(change.path, change);
    });

    // Add diff markers with proper modification handling
    const sourceDiff = this.addDiffMarkers(
      sourceLines,
      changes,
      "source",
      changesByPath,
      format
    );
    const targetDiff = this.addDiffMarkers(
      targetLines,
      changes,
      "target",
      changesByPath,
      format
    );

    return {
      source: sourceDiff,
      target: targetDiff,
    };
  }

  private formatData(
    data: ParsedData,
    format: "json" | "xml" | "yaml"
  ): string {
    switch (format) {
      case "json":
        return JSON.stringify(data, null, 2);
      case "xml":
        return this.objectToXML(data);
      case "yaml":
        return this.objectToYAML(data);
      default:
        return JSON.stringify(data, null, 2);
    }
  }

  private objectToXML(
    obj: any,
    rootName: string = "root",
    indent: number = 0
  ): string {
    const spaces = "  ".repeat(indent);

    if (typeof obj !== "object" || obj === null) {
      return `${spaces}<${rootName}>${obj}</${rootName}>`;
    }

    if (Array.isArray(obj)) {
      return obj
        .map((item) => this.objectToXML(item, rootName, indent))
        .join("\n");
    }

    let xml = `${spaces}<${rootName}>`;
    const entries = Object.entries(obj);

    if (entries.length > 0) {
      xml += "\n";
      for (const [key, value] of entries) {
        if (key === "@attributes") continue; // Skip attributes for simplicity
        xml += this.objectToXML(value, key, indent + 1) + "\n";
      }
      xml += spaces;
    }

    xml += `</${rootName}>`;
    return xml;
  }

  private objectToYAML(obj: any, indent: number = 0): string {
    const spaces = "  ".repeat(indent);

    if (typeof obj !== "object" || obj === null) {
      return String(obj);
    }

    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        return "[]";
      }
      return obj
        .map((item) => {
          if (typeof item === "object" && item !== null) {
            const itemYaml = this.objectToYAML(item, indent + 1);
            return `${spaces}- ${itemYaml.replace(/^\s+/, "")}`;
          } else {
            return `${spaces}- ${this.objectToYAML(item, 0)}`;
          }
        })
        .join("\n");
    }

    const entries = Object.entries(obj);
    return entries
      .map(([key, value]) => {
        if (typeof value === "object" && value !== null) {
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
      })
      .join("\n");
  }

  private addDiffMarkers(
    lines: string[],
    changes: ComparisonChange[],
    side: "source" | "target",
    changesByPath: Map<string, ComparisonChange>,
    format: "json" | "xml" | "yaml"
  ): string[] {
    const result: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let marker = " "; // Default: no change

      // Find the change that affects this line
      const affectingChange = changes.find((change) => {
        return this.lineMatchesChange(line, change, side, format, i, lines);
      });

      if (affectingChange) {
        if (affectingChange.change_type === "addition" && side === "target") {
          marker = "+";
        } else if (
          affectingChange.change_type === "deletion" &&
          side === "source"
        ) {
          marker = "-";
        } else if (affectingChange.change_type === "modification") {
          // Use special marker for modifications
          marker = "~";
        }
      }

      result.push(marker + line);
    }

    return result;
  }

  private lineMatchesChange(
    line: string,
    change: ComparisonChange,
    side: "source" | "target",
    format: "json" | "xml" | "yaml",
    lineIndex: number,
    allLines: string[]
  ): boolean {
    const pathParts = change.path.split(".");
    const lastKey = pathParts[pathParts.length - 1];

    // Special XML handling for nested tag content - used for finding all tags with content
    if (format === "xml") {
      const lineContent = line.trim();

      // For array-based changes specifically in XML
      if (change.is_array_item && change.parent_key) {
        // The specific value we're looking for (old or new depending on side)
        const value = side === "source" ? change.old_value : change.new_value;

        if (value !== undefined) {
          // Extract content from the XML tag - this is what we would be comparing
          const contentMatch = lineContent.match(/>([^<]+)</);
          const lineValue = contentMatch ? contentMatch[1].trim() : "";

          // If this line doesn't contain our target value, it's not a match
          if (lineValue !== String(value)) {
            return false;
          }

          // We found the value, now verify this is in the correct parent context/tag
          return true; // If we matched the content value in an XML tag, consider it a match
        }
      }
    }

    // Handle array indices
    const arrayMatch = lastKey.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, arrayKey, index] = arrayMatch;
      const arrayIndex = parseInt(index, 10);

      if (format === "xml") {
        // Get the appropriate value based on which side we're looking at
        const value = side === "source" ? change.old_value : change.new_value;

        // Special handling for modified array items
        if (change.is_array_item && change.parent_key === arrayKey) {
          const lineContent = line.trim();

          // Extract the tag name from the XML element (like "hobby" from "<hobby>gaming</hobby>")
          const elementTagMatch = lineContent.match(/<(\w+)>/);
          const elementTag = elementTagMatch ? elementTagMatch[1] : null;

          // Extract content between tags
          const contentMatch = lineContent.match(/>([^<]+)</);
          const lineValue = contentMatch ? contentMatch[1].trim() : "";

          // For array items, we need to identify if this line contains the exact value we're looking for
          if (value !== undefined && lineValue === String(value)) {
            // Now we need to verify this is the correct array index
            // We do this by counting similar elements from the beginning until this line

            // Find the parent array context
            let inArrayContext = false;
            let currentIndex = -1;

            for (let j = 0; j <= lineIndex; j++) {
              const checkLine = allLines[j].trim();

              // Check for start of array context
              if (checkLine.includes(`<${arrayKey}>`)) {
                inArrayContext = true;
                currentIndex = 0;
                continue;
              }

              // Check for end of array context
              if (checkLine.includes(`</${arrayKey}>`)) {
                inArrayContext = false;
                continue;
              }

              // If we're in the array context and this line contains an element of the same type
              // and we're not yet at our target line, increment the counter
              if (
                inArrayContext &&
                elementTag &&
                checkLine.includes(`<${elementTag}>`) &&
                j < lineIndex
              ) {
                currentIndex++;
              }

              // When we reach our target line, check if the index matches
              if (j === lineIndex && inArrayContext) {
                return currentIndex === arrayIndex;
              }
            }
          }

          return false;
        }

        // Standard handling for non-array items
        if (value !== undefined) {
          // For XML, check if this line contains the value
          const lineContent = line.trim();

          // Extract content between tags
          const contentMatch = lineContent.match(/>([^<]+)</);
          const lineValue = contentMatch ? contentMatch[1].trim() : "";

          // Compare extracted value with the change value
          const valueMatch =
            lineValue === String(value) ||
            lineContent.includes(`>${String(value)}<`);

          if (!valueMatch) {
            return false;
          }

          // Determine if we're inside the right XML tag
          const tagName = change.is_array_item
            ? arrayKey.slice(0, -1) || ""
            : arrayKey;

          // Check if this line contains the right tag
          const tagMatch =
            lineContent.includes(`<${tagName}>`) ||
            lineContent.includes(`</${tagName}>`) ||
            lineContent.includes(`<${tagName}`);

          if (!tagMatch) {
            return false;
          }

          // For array items, check if we're in the right array context and index
          if (change.is_array_item) {
            // Find the array parent and count elements to determine index
            let currentArrayContext = false;
            let currentIndex = -1;

            // First, identify if we're in the right array context
            for (let j = 0; j < lineIndex; j++) {
              const checkLine = allLines[j].trim();

              // Start of array context
              if (checkLine.includes(`<${arrayKey}>`)) {
                currentArrayContext = true;
                currentIndex = 0;
                continue;
              }

              // End of array context
              if (checkLine.includes(`</${arrayKey}>`)) {
                currentArrayContext = false;
                continue;
              }

              // Count array items of the same type
              if (currentArrayContext && checkLine.includes(`<${tagName}>`)) {
                if (j < lineIndex) {
                  currentIndex++;
                }
              }
            }

            // Now check if the current line is within the target element at the right index
            if (
              (currentArrayContext && lineContent.includes(`<${tagName}>`)) ||
              lineContent.includes(`</${tagName}>`)
            ) {
              return currentIndex === arrayIndex;
            }

            // Check if this line is the content of the target element
            if (currentArrayContext && valueMatch) {
              // Look backward to find the opening tag
              for (let j = lineIndex - 1; j >= 0; j--) {
                const prevLine = allLines[j].trim();
                if (prevLine.includes(`<${tagName}>`)) {
                  // We found the opening tag, now check if its index matches
                  let count = 0;
                  for (let k = 0; k < j; k++) {
                    if (allLines[k].trim().includes(`<${tagName}>`)) {
                      count++;
                    }
                  }
                  return count === arrayIndex;
                }
              }
            }
          }
        }

        // For modifications, also check if there is a matching change in the opposite side
        if (change.change_type === "modification") {
          const tagName = change.is_array_item
            ? arrayKey.slice(0, -1) || ""
            : arrayKey;

          // Check if this line contains the relevant tag and content
          const lineHasTag =
            line.includes(`<${tagName}>`) || line.includes(`</${tagName}>`);

          // Extract content from line
          const contentMatch = line.match(/>([^<]+)</);
          const lineValue = contentMatch ? contentMatch[1].trim() : "";

          // Check if this is the exact value that was modified
          return (
            lineHasTag &&
            ((side === "source" && lineValue === String(change.old_value)) ||
              (side === "target" && lineValue === String(change.new_value)))
          );
        }

        return false;
      } else if (format === "yaml") {
        // ... keep existing code (YAML array handling)
        if (line.includes(`${arrayKey}:`) && !line.trim().startsWith("- ")) {
          return false; // Don't highlight the parent array key
        }

        // Only highlight the specific array item
        if (line.trim().startsWith("- ")) {
          const value = side === "source" ? change.old_value : change.new_value;
          if (value !== undefined) {
            // Check if this line contains the specific value
            const lineValue = line.trim().substring(2).trim();
            return lineValue === String(value) || line.includes(String(value));
          }

          // For array items without specific values, count the array index
          let arrayItemCount = 0;
          for (let j = 0; j <= lineIndex; j++) {
            if (allLines[j].trim().startsWith("- ")) {
              if (j === lineIndex) {
                return arrayItemCount === arrayIndex;
              }
              arrayItemCount++;
            }
          }
        }
        return false;
      } else if (format === "json") {
        // ... keep existing code (JSON array handling)
        const value = side === "source" ? change.old_value : change.new_value;
        if (value !== undefined && line.includes(String(value))) {
          return true;
        }
      }
      return false;
    }

    // For non-array changes, check if this is an array parent key that shouldn't be highlighted
    if (change.is_array_item && change.parent_key) {
      if (
        format === "yaml" &&
        line.includes(`${change.parent_key}:`) &&
        !line.trim().startsWith("- ")
      ) {
        return false; // Don't highlight parent array key in YAML
      }
      if (
        format === "xml" &&
        line.includes(`<${change.parent_key}>`) &&
        !line.includes("</")
      ) {
        return false; // Don't highlight parent array opening tag in XML
      }
    }

    // Regular key matching for non-array items
    const keyFromPath = lastKey || "";
    let lineContainsKey = false;

    if (format === "json") {
      lineContainsKey = line.includes(`"${keyFromPath}"`);
    } else if (format === "yaml") {
      lineContainsKey = line.includes(`${keyFromPath}:`);
    } else if (format === "xml") {
      lineContainsKey = line.includes(`<${keyFromPath}>`);
    }

    if (!lineContainsKey) return false;

    // Check if the line contains the relevant value
    const value = side === "source" ? change.old_value : change.new_value;
    if (value !== undefined) {
      return line.includes(String(value));
    }

    return true;
  }
}
