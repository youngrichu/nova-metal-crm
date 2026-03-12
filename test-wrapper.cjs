const PdfMake = require('pdfmake');
const fonts = {
	Roboto: {
		normal: 'node_modules/pdfmake/build/vfs_fonts.js'
	}
};
var printer = new PdfMake(fonts);
console.log(printer);
