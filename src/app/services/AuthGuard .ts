import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { BlockstackService } from './blockstack.service';

@Injectable()
export class AuthGuard implements CanActivate {

    constructor(private router: Router,
        private blockstackService: BlockstackService) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        
        if (this.blockstackService && this.blockstackService.userSession && this.blockstackService.userSession.isUserSignedIn()) {
            // logged in so return true
            return true;
        }

        // not logged in so redirect to login page with the return url
        this.router.navigate(['']);
        return false;
    }
}