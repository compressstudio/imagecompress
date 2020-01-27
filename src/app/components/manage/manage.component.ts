import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { BlockstackService } from 'src/app/services/blockstack.service';

@Component({
  selector: 'app-manage',
  templateUrl: './manage.component.html',
  styleUrls: ['./manage.component.css']
})
export class ManageComponent implements OnInit, OnChanges {

  @Input() imagesObj;
  images;
  @Output() deleteImageEventEmitter = new EventEmitter();

  page = 1;
  pageSize = 16;

  // displayImages
  displayImages = [];
  base64Images = {};

  constructor(private blockstackService: BlockstackService) {
  }

  ngOnInit() {
  }

  ngOnChanges(changes) {
    if (changes.imagesObj && changes.imagesObj.currentValue && changes.imagesObj.currentValue.images) {
      this.images = changes.imagesObj.currentValue.images;
      this.loadDisplayImages();
    }
  }

  loadDisplayImages() {

    // Calculate start index
    let startIdx = (this.page - 1) * this.pageSize;

    // Reset display images
    this.displayImages = [];

    // Loop for page size from start index
    for (let i = 0; i < this.pageSize; i++) {

      if (startIdx < this.images.length) {
        this.displayImages.push(this.images[startIdx]);

        // load image from gaia
        if (this.images[startIdx] && this.images[startIdx].file) {
          this.loadBase64Image(this.images[startIdx].file);
        }
      } else {
        break;
      }

      // Increase by one
      startIdx = startIdx + 1;
    }
  }

  /**
   * Get images from Gaia
   * 
   * @param shaHashCode 
   */
  loadBase64Image(shaHashCode) {

    // If the image is not loaded, then get from gaia.
    if (!this.base64Images[shaHashCode]) {
      // Say loading
      this.base64Images[shaHashCode] = "loading";

      this.blockstackService.userSession.getFile(shaHashCode)
        .then((fileContents) => {
          this.base64Images[shaHashCode] = fileContents;
        });
    }

  }

  /**
   * Delete the index of image
   * 
   * @param index 
   */
  deleteImage(index) {

    // Calculate start index
    let startIdx = (this.page - 1) * this.pageSize;
    let deleteIdx = startIdx + index;

    this.deleteImageEventEmitter.emit(deleteIdx);

    this.loadDisplayImages();
  }

}
