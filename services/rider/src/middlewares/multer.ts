import multer from 'multer';
import type { RequestHandler } from 'express';

const storage = multer.memoryStorage();

const upload = multer({
	storage,
	limits:{fileSize:5 * 1024 * 1024},
	fileFilter:(_req, file, callback)=>{
		callback(null, file.mimetype.startsWith("image/"));
	},
}).single("file");

const uploadFile: RequestHandler = (req, res, next) => {
	upload(req, res, (error) => {
		if (!error) {
			next();
			return;
		}

		if (error instanceof multer.MulterError) {
			const isTooLarge = error.code === "LIMIT_FILE_SIZE";
			res.status(isTooLarge ? 413 : 400).json({
				message: isTooLarge
					? "Rider image must be 5 MB or smaller"
					: error.message,
			});
			return;
		}

		next(error);
	});
};

export default uploadFile;