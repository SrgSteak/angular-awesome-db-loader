import 'zone.js/dist/zone';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { bootstrapApplication } from '@angular/platform-browser';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ShopService } from './shop.service';
import { Observable, Subscription } from 'rxjs';
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

export const birthdayDateValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  //console.log('validating!');
  const year = +control.get('year').value;
  const month = +control.get('month').value;
  const day = +control.get('day').value;
  if (year === null && month === null && day === null) {
    return null;
  }
  // validate year
  if (year < 1923) {
    return { yearTooOld: year };
  }
  if (year > 2023) {
    return { yearTooNew: year };
  }

  // validate month
  if (month > 12) {
    return { monthTooHigh: month };
  }

  // validate day
  if (day > 28) {
    if (month === 2) {
      const isLeapYear =
        year % 4 === 0 &&
        (year % 100 !== 0 || (year % 100 === 0 && year % 400 === 0));
      if ((isLeapYear && day > 29) || !isLeapYear) {
        return { dayOfMonthInvalid: day };
      }
    } else if ([4, 6, 9, 11].indexOf(month) !== -1) {
      if (day > 30) {
        return { dayOfMonthInvalid: day };
      }
    } else {
      if (day > 31) {
        return { dayOfMonthInvalid: day };
      }
    }
  }

  // everything is okay
  return null;
};
