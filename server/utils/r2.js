const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

function isR2Configured() {
    return Boolean(
        process.env.R2_ENDPOINT &&
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY &&
        process.env.R2_BUCKET &&
        process.env.R2_PUBLIC_BASE_URL
    );
}

function buildPublicUrl(key) {
    const base = process.env.R2_PUBLIC_BASE_URL.replace(/\/+$/, '');
    return `${base}/${key}`;
}

function createClient() {
    return new S3Client({
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
        }
    });
}

async function uploadBufferToR2({ buffer, contentType, keyPrefix, originalName }) {
    const client = createClient();
    const safeName = (originalName || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${keyPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

    const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType || 'application/octet-stream'
    });

    await client.send(command);

    return { key, publicUrl: buildPublicUrl(key) };
}

module.exports = {
    isR2Configured,
    uploadBufferToR2,
    buildPublicUrl
};
