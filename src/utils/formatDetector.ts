export class FormatDetector {
  static detectFormat(content: string, filename?: string): 'json' | 'xml' | 'yaml' {
    // First try to detect from filename extension
    if (filename) {
      const ext = filename.toLowerCase().split('.').pop();
      if (ext === 'json') return 'json';
      if (ext === 'xml') return 'xml';
      if (ext === 'yaml' || ext === 'yml') return 'yaml';
    }

    // Fallback to content analysis
    const trimmed = content.trim();
    
    // JSON detection
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        JSON.parse(trimmed);
        return 'json';
      } catch {
        // Not valid JSON, continue checking
      }
    }
    
    // XML detection
    if (trimmed.startsWith('<') && trimmed.includes('>')) {
      return 'xml';
    }
    
    // YAML detection (default fallback)
    return 'yaml';
  }

  static validateFormat(content: string, format: 'json' | 'xml' | 'yaml'): boolean {
    try {
      switch (format) {
        case 'json':
          JSON.parse(content);
          return true;
        case 'xml':
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(content, 'text/xml');
          return !xmlDoc.querySelector('parsererror');
        case 'yaml':
          // Basic YAML validation - check for basic structure
          const lines = content.split('\n');
          return lines.some(line => line.includes(':'));
        default:
          return false;
      }
    } catch {
      return false;
    }
  }
}