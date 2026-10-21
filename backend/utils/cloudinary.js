const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_API_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadImage = (imageData) => new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
        {
            folder: 'veltrix/autok',
            resource_type: 'image',
        },
        (error, result) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(result);
        },
    ).end(Buffer.from(imageData.split(',').pop(), 'base64'));
});

module.exports = { uploadImage };
