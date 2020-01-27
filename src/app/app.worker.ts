/// <reference lib="webworker" />

import imageCompression from 'browser-image-compression';

addEventListener('message', ({ data }) => {

  // Start compress
  imageCompression(data.imageFile, data.options)
    .then((compressedFile) => {
      // Once the file is compressed. Just pass it back.
      postMessage(compressedFile);
    })
    .catch((error) => {
      // Post the error message
      postMessage({ "error": error });
    });

});
