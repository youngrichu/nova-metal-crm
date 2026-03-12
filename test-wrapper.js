const PdfMake = require('pdfmake');
const fonts = {
	Roboto: {
		normal: 'node_modules/pdfmake/build/vfs_fonts.js',
		bold: 'node_modules/pdfmake/build/vfs_fonts.js',
		italics: 'node_modules/pdfmake/build/vfs_fonts.js',
		bolditalics: 'node_modules/pdfmake/build/vfs_fonts.js'
	}
};
var printer = new PdfMake(fonts); // Try instantiation
console.log(printer);
