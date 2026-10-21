const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_API_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadImage = (imageData) => new Promise((resolve, reject) => {
    if (typeof imageData !== 'string' || !imageData.startsWith('data:image/')) {
        reject(new Error('Érvénytelen képformátum.'));
        return;
    }

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

const deleteImage = (publicId) => new Promise((resolve, reject) => {
    if (!publicId) {
        resolve();
        return;
    }

    cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
            reject(error);
            return;
        }
        resolve(result);
    });
});

module.exports = { uploadImage, deleteImage };
