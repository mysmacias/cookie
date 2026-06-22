// Image picking on the web is handled entirely through hidden <input type="file">
// elements (see HiddenFileInputs + useImagePicker). This module just re-exports
// the shared JPEG quality constant used by the photo-scan flow.
export { CAMERA_JPEG_QUALITY } from '../constants/config';
