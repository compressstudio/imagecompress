import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AppConfig, UserSession } from 'blockstack';
import { showBlockstackConnect } from '@blockstack/connect';
import { authenticate } from '@blockstack/connect';


@Injectable({
  providedIn: 'root'
})
export class BlockstackService {

  // UserSession
  userSession;

  /**
   * Constructor
   */
  constructor(private router: Router) {
    const appConfig = new AppConfig(['store_write', 'publish_data']);
    this.userSession = new UserSession({ appConfig: appConfig });

    // BS Login Module
    if (!this.userSession.isUserSignedIn() && this.userSession.isSignInPending()) {

      // If it is in progress
      this.userSession.handlePendingSignIn()
        .then((userData) => {
          if (!userData.username) {
            throw new Error('This app requires a username.')
          }
        });

      // Redirect to previous page
      this.router.navigate([""]);
    }

  }

  /**
  * Blockstack Login
  */
  login() {

   // Login page of Blockstack
    //new blockstack auth
   
    const authOptions = { 
      redirectTo: '/',
      manifestPath: '/manifest.json',
   //  authOrigin: "http://localhost:4200",
      sendToSignIn: false,
      userSession: this.userSession,
      appDetails: {
        name: 'Compress Studio',
        icon:'https://compress.studio/favicon.ico'
       
      }
    };
    showBlockstackConnect(authOptions);
       
    // this.userSession.redirectToSignIn();
  }

  /**
   * Blockstack Logout
   */
  logout() {
    // Logout
    this.userSession.signUserOut();

    this.router.navigate(['']);
  }
}
