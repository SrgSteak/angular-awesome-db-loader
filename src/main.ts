import 'zone.js/dist/zone';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { bootstrapApplication } from '@angular/platform-browser';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ShopService } from './shop.service';
import { Subscription } from 'rxjs';
import { ResourceInterface, ShopInterface } from './shop-interface';
import { ResourceLoaderService } from './resource-loader.service';

@Component({
  selector: 'my-app',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  providers: [ShopService, ResourceLoaderService],
  styles: [],
  template: `<ng-container *ngIf="shop">{{ shop | json }}</ng-container>`,
})
export class App implements OnInit {
  protected shop: ResourceInterface<ShopInterface>;
  protected sub: Subscription;

  constructor(private fb: FormBuilder, private shopService: ShopService) {}

  ngOnInit() {
    this.sub = this.shopService.getById(136).subscribe(data => {
      console.log('pulled from:', data.origin);
      this.shop = data;
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}

bootstrapApplication(App);