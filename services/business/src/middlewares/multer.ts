import multer from 'multer';

const storage = multer.memoryStorage();

const uploadFile = multer({
	storage,
	limits:{fileSize:5 * 1024 * 1024},
	fileFilter:(_req, file, callback)=>{
		callback(null, file.mimetype.startsWith("image/"));
	},
}).single("file");

export default uploadFile;