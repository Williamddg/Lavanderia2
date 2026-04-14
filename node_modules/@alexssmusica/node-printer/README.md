# @alexssmusica/node-printer

Node.js native module for printer management and printing functionality.

## Installation

```bash
npm install @alexssmusica/node-printer
```

## Requirements

- Node.js >= 18.0.0
- Windows: No additional requirements
- Linux/macOS: CUPS (Common Unix Printing System)

## Features

- Direct printing of raw data or text
- File printing
- Printer management (list, get info, set defaults)
- Job management (view, control)
- Cross-platform support (Windows, Linux, macOS)

## API Reference

### Printer Operations

#### `getPrinters()`
Returns an array of all available printers with their properties and current jobs.

```javascript
const printer = require('@alexssmusica/node-printer');
const printers = printer.getPrinters();
```

#### `getDefaultPrinterName()`
Returns the name of the default printer. Returns `null` if no default printer is set.

```javascript
const defaultPrinter = printer.getDefaultPrinterName();
```

#### `getPrinter(printerName)`
Get detailed information about a specific printer.

- `printerName` {String} Name of the printer

```javascript
const printerInfo = printer.getPrinter('My Printer');
```

#### `getPrinterDriverOptions(printerName)`
Get printer driver specific options.

- `printerName` {String} Name of the printer

```javascript
const driverOptions = printer.getPrinterDriverOptions('My Printer');
```

### Printing Functions

#### `printDirect(options)`
Print raw data directly to the printer.

Options:
- `data` {String|Buffer} Raw data to print
- `printer` {String} Printer name
- `docname` {String} Document name
- `type` {String} Data type (e.g., 'RAW', 'TEXT')

```javascript
printer.printDirect({
  data: 'Hello World!',
  printer: 'My Printer',
  docname: 'Test Document',
  type: 'RAW'
});
```

#### `printFile(options)`
Print a file directly to the printer.

Options:
- `filename` {String} Path to the file to print
- `printer` {String} Printer name
- `docname` {String} Document name

```javascript
printer.printFile({
  filename: '/path/to/file.txt',
  printer: 'My Printer',
  docname: 'File Document'
});
```

### Job Management

#### `getJob(printerName, jobId)`
Get information about a specific print job.

- `printerName` {String} Name of the printer
- `jobId` {Number} ID of the job

```javascript
const jobInfo = printer.getJob('My Printer', 123);
```

#### `setJob(printerName, jobId, command)`
Control print jobs using various commands.

- `printerName` {String} Name of the printer
- `jobId` {Number} ID of the job
- `command` {String} Job command

Available commands:
- `"CANCEL"`
- `"PAUSE"`
- `"RESTART"`
- `"RESUME"`
- `"DELETE"`
- `"SENT-TO-PRINTER"`
- `"LAST-PAGE-EJECTED"`
- `"RETAIN"`
- `"RELEASE"`

```javascript
printer.setJob('My Printer', 123, 'PAUSE');
```

### Utility Functions

#### `getSupportedPrintFormats()`
Get a list of supported print formats for direct printing.

```javascript
const formats = printer.getSupportedPrintFormats();
```

#### `getSupportedJobCommands()`
Get a list of supported job commands.

```javascript
const commands = printer.getSupportedJobCommands();
```

## Platform Specific Notes

### Windows
- Supports both local and network printers
- Raw printing supported through Windows API

### Linux/macOS
- Requires CUPS installation
- Minimum CUPS version: 1.1.21 (OS X 10.4)
- Uses CUPS API for printer management and printing

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 