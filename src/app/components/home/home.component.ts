import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import * as blockstack from 'blockstack';
import imageCompression from 'browser-image-compression';
import { sha256 } from 'js-sha256';
import { BlockstackService } from 'src/app/services/blockstack.service';
import * as ScrollMagic from 'scrollmagic';

import { ConnectionService } from "ng-connection-service";

import {
  TimelineMax, TweenMax, Linear, Elastic
} from 'gsap'

import { ScrollMagicPluginGsap } from "scrollmagic-plugin-gsap";
import { Key } from 'protractor';

declare var $: any;

// Create a new worker
var worker = null;
if (typeof Worker !== 'undefined') {
  worker = new Worker('../../app.worker', { type: 'module' });
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {

  // Variable

  // Blockstack variable
  bs = blockstack;

  status = 'online';
  isConnected = true;
 

  // Before and after compress
  beforeImg = "../../../assets/images/compress-studio-before.webp";
  afterImg = "../../../assets/images/compress-studio-after.webp";
  originalImageFile = null;

  beforeImgSize = 543.24;
  afterImgSize = 131.3;

  widthRes = 1920;
  heightRes = 1080;

  downloadImageName = "compressed.jpg";

  // Right Side Options fields
  sizeToCompress: number = 0.2;

  isProcessing = false;
  errorMsg;
  reCompressErrorMsg;
  compressPercentage = 76;

  // Set Default View
  view;

  // My Images
  images;
  //IndexedDB Database
  db: IDBDatabase;
  // Is it IE/Edge Browser
  isIEOrEdge = false;

  scrollMagicController = new ScrollMagic.Controller();

  // Tooltip slider
  isSliderMoved = true;

  /**
   * Constructor
   * 
   * @param router 
   */
  constructor(private route: ActivatedRoute,
    private router: Router,
    private httpClient: HttpClient,
    public blockstackService: BlockstackService,
    private connectionService: ConnectionService ) {

     //if connected online from offline check indexedDB 
      this.connectionService.monitor().subscribe(isConnected => {
        this.isConnected = isConnected;
        if (this.isConnected) {
          this.status = "online";
          var transaction = this.db.transaction(["images"], "readwrite");
          var objectStore = transaction.objectStore("images");

          //get items from indexedDB  
          var items = [];
               
          var cursorRequest = objectStore.openCursor();
          cursorRequest.onsuccess = function(evt:any) {                    
          var cursor = evt.target.result;
             if (cursor) {
              items.push(cursor.value);
              cursor.continue();
             }
         };
         cursorRequest.onerror = function(error) {
           console.log(error);
       };

         
       transaction.oncomplete = (evt) => {  
           if(items.length > 0) {
             var len = items.length;
             for (var i = 0; i < len; i += 1) {
                 let localItem = items[i];

                 //store in gaia
                 this.saveImage(localItem.name, localItem.size, localItem.file, localItem.image);
             }            
           }
         };  
        }
        else {
          this.status = "offline";
        }
      })



      //Open IndexedDB
      var request = indexedDB.open("compressDB", 2);
      request.onerror = function(event) {
       console.error("Error creating/accessing IndexedDB database");
     };
     request.onsuccess = event => {
       this.db = request.result;
       console.log("Success creating/accessing IndexedDB database");
 
       //reader.readAsDataURL(file);
       this.db.onerror = event => {
         console.error("Error creating/accessing IndexedDB database");
       };
     };
     // Create Object Store
     request.onupgradeneeded = event => {
       console.log("Creating object store");
       this.db = request.result;
       this.db.createObjectStore("images");
     };
 



    // Initialize the scroll magic
    ScrollMagicPluginGsap(ScrollMagic, TweenMax, TimelineMax);

    // On change of URL Param, this event will be triggered
    this.router.events.subscribe((evt) => {
      if (evt instanceof NavigationEnd) {
        if (evt.url == "/manage") {
          this.view = 'manage';

          // if you need to scroll back to top, here is the right place
          window.scrollTo(0, 0);

        } else {
          this.view = 'home';
          // Re-rendering the twenty-twenty container
          setTimeout(() => {
            (<any>$("#beforeafter")).twentytwenty();

            this.initScrollMagicAnimation();
          }, 1);
        }
      }
    });

    // Get the original Image first time
    this.getImage("../../../assets/images/compress-studio-before.webp");

    // Get all images from Gaia
    if (this.blockstackService.userSession.isUserSignedIn()) {
      this.getImagesFromGaia();
    } else if (!this.blockstackService.userSession.isUserSignedIn() && this.blockstackService.userSession.isSignInPending()) {
      // If it is in progress
      this.blockstackService.userSession.handlePendingSignIn()
        .then((userData) => {
          //sync offline indexedDB to gaia
       //   this.syncOfflineImagesToGaia();
          this.getImagesFromGaia();
        });
    }

  }

  ngAfterViewInit() {
    // Load the animaztion
    //this.initScrollMagicAnimation();
  }

  /**
   * Once file is selected, load an image
   */
  validateAndUploadImage(file, maxSizeMB = 0.2, isReCompress = false) {

    //Resetting the error message
    this.errorMsg = null;
    this.reCompressErrorMsg = null;

    if (file) {
      // Temp Variable
      const imageFile = file;

      // Take copy of uploaded original file
      if (isReCompress == false) {
        this.originalImageFile = imageFile;

        // Reset the setting
        if ((imageFile.size / 1024) < 200) {
          maxSizeMB = imageFile.size / 1024 / 1024;
          this.sizeToCompress = Number.parseFloat(maxSizeMB.toFixed(3));
        } else {
          this.sizeToCompress = 0.2;
        }
      }

      try {
        // Supported format
        if (imageFile.type == "image/jpg" || imageFile.type == "image/jpeg" || imageFile.type == "image/png" || imageFile.type == "image/x-icon") {

          // Start loading
          this.isProcessing = true;

          // Download Image filename
          if (imageFile && imageFile.name) {
            let imageNameSplit = imageFile.name.split(".");
            this.downloadImageName = imageNameSplit[0] + "_compressed" + "." + imageNameSplit[imageNameSplit.length - 1];
          } else {
            this.downloadImageName = "compressed.jpg";
          }

          // Fixed configuration
          var options = {
            maxSizeMB: maxSizeMB,
            maxWidthOrHeight: 1920,
            useWebWorker: true
          }

          // Finding the browser
          this.isIEOrEdge = /msie\s|trident\/|edge\//i.test(window.navigator.userAgent);
          var isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

          // If the browser supports webwork, just use it to compress, just run on main thread
          if (worker && this.isIEOrEdge == false && this.detectMob() == false && isFirefox == false) {
            worker.onmessage = ({ data }) => {
              // Once image is compressed
              if (data && data.size) {
                var reader = new FileReader();
                reader.onload = this._handleReader.bind(this, imageFile, data);
                reader.readAsBinaryString(data);
              } else { // If error is occured, retry with out webworker
                // Compress with out webworker
                this.compressWithoutWebWorker(imageFile, options, isReCompress);
              }
            };

            // Start image compression processing with web worker
            worker.postMessage({ "imageFile": imageFile, "options": options });
          } else {
            // Web Workers are not supported in this environment.
            // You should add a fallback so that your program still executes correctly.

            // Compress with out webworker
            this.compressWithoutWebWorker(imageFile, options, isReCompress);
          }

        } else {
          throw "The file type you uploaded isn't supported. Try again with a JPG, JPEG, or PNG.";
        }
      } catch (e) {
        if (isReCompress) {
          this.reCompressErrorMsg = e;
        } else {
          this.errorMsg = e;
        }

        // Stop Loading
        this.isProcessing = false;
      }
    }
  }

  /**
   * Compress with our webworker
   * 
   * @param imageFile 
   * @param options 
   * @param isReCompress 
   */
  compressWithoutWebWorker(imageFile, options, isReCompress) {
    // Set Webworker as false
    options.useWebWorker = false;

    // Start compress
    imageCompression(imageFile, options)
      .then((compressedFile) => {

        var reader = new FileReader();
        reader.onload = this._handleReader.bind(this, imageFile, compressedFile);
        reader.readAsBinaryString(compressedFile);

      })
      .catch((error) => {
        if (isReCompress) {
          this.reCompressErrorMsg = error.message;
        } else {
          this.errorMsg = error.message;
        }

        // Stop Loading
        this.isProcessing = false;
      });
  }

  /**
   * Compressed Image Handling
   * 
   * @param beforeImgFile 
   * @param afterImgFile 
   * @param readerEvt 
   */
  _handleReader(beforeImgFile, afterImgFile, readerEvt) {
    var afterImgBinaryString = readerEvt.target.result;

    var reader = new FileReader();
    reader.onload = (e) => {
      var beforeImgBinaryString: any = reader.result;

      // Get Image height and width
      var afterImgObject = new Image();
      afterImgObject.src = 'data:image/jpg;base64,' + btoa(afterImgBinaryString);
      afterImgObject.onload = () => {
        this.widthRes = afterImgObject.width;
        this.heightRes = afterImgObject.height;

        // Display image and file size on UI        
        this.afterImg = 'data:image/jpg;base64,' + btoa(afterImgBinaryString);
        // If original image size is more than 30 MB, just show the compressed image on UI for fast rendering
        if (beforeImgFile.size >= 31457280) {
          this.beforeImg = 'data:image/jpg;base64,' + btoa(afterImgBinaryString);
        } else {
          this.beforeImg = 'data:image/jpg;base64,' + btoa(beforeImgBinaryString);
        }

        this.beforeImgSize = beforeImgFile.size / 1024;
        this.afterImgSize = afterImgFile.size / 1024;

        // Calculate percentage
        this.compressPercentage = Math.round(((this.beforeImgSize - this.afterImgSize) / (this.beforeImgSize)) * 100);

        // Re-rendering the twenty-twenty container
        setTimeout(() => {
          (<any>$("#beforeafter")).twentytwenty();
        }, 2);

        // save image, if user logged in
        if (this.blockstackService.userSession && this.blockstackService.userSession.isUserSignedIn()) {
          try {
            // Store on Gaia storage
            //this.saveImage(this.downloadImageName, afterImgFile.size, sha256(btoa(afterImgBinaryString)), this.afterImg);
            this.saveImageToIndexedDB(this.downloadImageName, afterImgFile.size, sha256(btoa(afterImgBinaryString)), this.afterImg);
            console.log("Success stored in gaia");
          } catch {
            console.log("Not stored in gaia");
          }
        }
        this.isProcessing = false;
      };
    };
    reader.readAsBinaryString(beforeImgFile);
  }

  /**
   * 
   * @param imgName 
   * @param imgSize 
   * @param imgFile 
   */
  saveImage(imgName, imgSize, sha256Hash, imgFile) {
    // imgName, imgSize, Date and sha256 hash
    //empty images.. so lets initialize it
    if(!this.images){
      this.images = [];
    }
    
    let image = {
      "name": imgName,
      "size": imgSize,
      "date": Date.now(),
      "file": sha256Hash,
      
    };

      // Save image and index
    this.blockstackService.userSession.putFile(sha256Hash, imgFile).then((response) => {
        // Update Index
        this.images.unshift(image);
        // Save index
        this.blockstackService.userSession.putFile("images.json", JSON.stringify(this.images)).then((response) => {
            // delete the current file from local indexedDB
            var transaction = this.db.transaction(["images"], "readwrite");
            transaction.objectStore("images").delete(sha256Hash).onsuccess = (event) => {
                console.log("cleared uploaded file sucessfully from local");
            }
        });
      });
  }


  /**
   * Save image to offline indexedDB
   * @param imgName 
   * @param imgSize 
   * @param imgFile 
   */
  saveImageToIndexedDB(imgName, imgSize, sha256Hash, imgFile) {
    // imgName, imgSize, Date and sha256 hash
    if (this.images) {

      let image = {
        "name": imgName,
        "size": imgSize,
        "date": Date.now(),
        "file": sha256Hash,
        "image":imgFile
      };
      var transaction = this.db.transaction(["images"], "readwrite");
      // file.name = key and data = value
      var put = transaction.objectStore("images").put(image,image.file);
      put.onsuccess = () => {
        console.log("stores sucessfully to localDB");

      //if online store in gaia

        if(this.status=="online") {
           this.saveImage(imgName, imgSize, sha256Hash, imgFile); 
        }
      }
      put.onerror=()=> {
        console.log("Error while storing data");
      }
    }
  }

  /**
   * Get the file from given URL
   * 
   * @param imageUrl 
   */
  getImage(imageUrl: string) {
    this.httpClient.get(imageUrl, { responseType: 'blob' }).subscribe((file) => {
      // If the file is loaded, assign to original image.
      if (file) {
        this.originalImageFile = file;
      }
    });
  }

 
  /**
   * Get all my images from gaia.
   */
  getImagesFromGaia() {
    try{
      // Get all images
      this.blockstackService.userSession.getFile("images.json")
      .then((fileContents) => {
        console.log(fileContents);
        //append to gaia
        if (fileContents != null && fileContents.length > 3) { // if it exists, load to view
          this.images = JSON.parse(fileContents);
        } else { // Initialize empty 
          this.images = [];
        }
      },
      error => {
        //console.error(error);
        this.images = [];
      });
    } catch(e) {
      this.images = [];
    }
  }

  /**
   * Delete image from my images
   * 
   * @param index 
   */
  deleteImage(index) {
    if (index < this.images.length) {
      this.images.splice(index, 1);

      // Save index
      this.blockstackService.userSession.putFile("images.json", JSON.stringify(this.images));
    }
  }

  /**
   * Detect the mobile device
   */
  detectMob() {
    if (navigator.userAgent.match(/Android/i)
      || navigator.userAgent.match(/webOS/i)
      || navigator.userAgent.match(/iPhone/i)
      || navigator.userAgent.match(/iPad/i)
      || navigator.userAgent.match(/iPod/i)
      || navigator.userAgent.match(/BlackBerry/i)
      || navigator.userAgent.match(/Windows Phone/i)
    ) {
      return true;
    }
    else {
      return false;
    }
  }

  initScrollMagicAnimation() {
    var optimizeTweens = new TimelineMax()
      .add(TweenMax.from("#optimizeTitleId", 0.7, { y: 30, opacity: 0 }), "optimizeTitleId")
      .add(TweenMax.from("#optimizePoint1", 0.7, { y: 30, opacity: 0 }), "optimizePoint1")
      .add(TweenMax.from("#optimizePoint2", 0.7, { y: 30, opacity: 0 }), "optimizePoint2")
      .add(TweenMax.from("#optimizePoint3", 0.7, { y: 30, opacity: 0 }), "optimizePoint3")
      .add(TweenMax.from("#optimizePoint4", 0.7, { y: 30, opacity: 0 }), "optimizePoint4");

    new ScrollMagic.Scene({
      triggerElement: "#optimizeId",
      triggerHook: 0,
      duration: "100%"
    })
      .setPin("#optimizeId")
      .setTween(optimizeTweens)
      .addTo(this.scrollMagicController);

    var supportTweens = new TimelineMax()
      .add(TweenMax.from("#supportTitleId", 0.7, { y: 30, opacity: 0 }), "supportTitleId")
      .add(TweenMax.from("#supportPoint1", 0.7, { y: 30, opacity: 0 }), "supportPoint1");

    new ScrollMagic.Scene({
      triggerElement: "#supportId",
      triggerHook: 0,
      duration: "100%"
    })
      .setPin("#supportId")
      .setTween(supportTweens)
      .addTo(this.scrollMagicController);

    var storageTweens = new TimelineMax()
      .add(TweenMax.from("#storageTitleId", 0.7, { y: 30, opacity: 0 }), "storageTitleId")
      .add(TweenMax.from("#storagePoint1", 0.7, { y: 30, opacity: 0 }), "storagePoint1")
      .add(TweenMax.from("#storagePoint2", 0.7, { y: 30, opacity: 0 }), "storagePoint2")
      .add(TweenMax.from("#storagePoint3", 0.7, { y: 30, opacity: 0 }), "storagePoint3")
      .add(TweenMax.from("#storagePoint4", 0.7, { y: 30, opacity: 0 }), "storagePoint4")
      .add(TweenMax.from("#storagePoint5", 0.7, { y: 30, opacity: 0 }), "storagePoint5");

    new ScrollMagic.Scene({
      triggerElement: "#storageId",
      triggerHook: 0,
      duration: "100%"
    })
      .setPin("#storageId")
      .setTween(storageTweens)
      .addTo(this.scrollMagicController);

    new ScrollMagic.Scene({
      triggerElement: "#howItWorksSectionId",
      triggerHook: 0.8,
    })
      .setClassToggle("#howItWorksSectionId", "fade-in")
      .addTo(this.scrollMagicController);

    new ScrollMagic.Scene({
      triggerElement: "#featuresSectionId",
      triggerHook: 0.8,
    })
      .setClassToggle("#featuresSectionId", "fade-in")
      .addTo(this.scrollMagicController);
  }
}
