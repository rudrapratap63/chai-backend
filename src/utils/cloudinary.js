import { v2 as cloudinary } from "cloudinary";  
import fs from "fs";
import dotenv from "dotenv"

dotenv.config({
	 path : "./.env"
})

cloudinary.config({ 
	cloud_name: process.env.CLOUD_NAME, 
	api_key: process.env.CLOUDINARY_API_KEY, 
	api_secret: process.env.CLOUDINARY_API_SECRET
});

const cloudinaryUpload = async (localFilePath) => {
	try {
		if(!localFilePath) return null;
		const response = await cloudinary.uploader.upload(localFilePath, { resource_type :"auto" });
		fs.unlinkSync(localFilePath);
		return response;
	} catch (error) {
		fs.unlinkSync(localFilePath);
		return null;
	}
}

export const deleteCloudinaryImage = async (url) => {
   try {
		const publicId = getPublicId(url);
		const response = await cloudinary.uploader.destroy(publicId, {resource_type: "auto"});
		return response;
	} catch (error) {
		return null;
	}
}

function getPublicId(url){
	const parts = url.split('/');
	const fileName = parts.pop().split('.')[0];
	const folder = parts.slice(parts.indexOf('upload') + 2).join('/');
	if(folder.empty()) return `${fileName}`;
	else return `${folder}/${fileName}`;
}

export default cloudinaryUpload;