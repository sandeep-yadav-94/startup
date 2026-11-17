import multer from 'multer';
import type { RequestHandler } from "express";

const storage = multer.memoryStorage();

const uploadFiles = multer({
	storage,
	limits:{fileSize:5 * 1024 * 1024, files:2},
	fileFilter:(_req, file, callback)=>{
		callback(null, file.mimetype.startsWith("image/"));
	},
}).fields([
	{name:"file", maxCount:1},
	{name:"upiQrCode", maxCount:1},
]);

const uploadFile: RequestHandler = (req, res, next) => {
	uploadFiles(req, res, (error) => {
		if (error) {
			next(error);
			return;
		}
		const files = req.files;
		if (files && !Array.isArray(files)) req.file = files.file?.[0];
		next();
	});
};

export default uploadFile;
