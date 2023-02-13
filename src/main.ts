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
import { Observable } from 'rxjs';
import { ShopInterface } from './shop-interface';
import { ResourceLoaderService } from './resource-loader.service';

@Component({
  selector: 'my-app',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  providers: [ShopService, ResourceLoaderService],
  styles: [
    '.form-input { display:inline; position: relative; }',
    'input:focus~label, input:not(:placeholder-shown)~label { transform: scale(0.5); }',
    'label { pointer-events: none; position: absolute; left: 0; transform-origin: top left; transition: all .2s ease-in-out }',
    'input { all: unset; display: inline; text-align: center; height: 2rem; }',
    'input {  appearance: none; -webkit-appearance: none; }',
    '//input::-webkit-textfield-decoration-container { display: none }',
    'input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0;}',
    /* Firefox */
    'input[type=number] { -moz-appearance: textfield; }',
  ],
  template: `<ng-container *ngIf="shop$ | async as shop; else loadingError">
    {{ shop | json }}
  </ng-container>
  <ng-template #loadingError>
    Loading error
  </ng-template>`,
})
export class App implements OnInit {
  name = 'Angular';
  protected birthdayForm = this.fb.group(
    {
      day: ['29'],
      month: ['2'],
      year: ['2020'],
    },
    { validators: birthdayDateValidator }
  );
  protected shop$: Observable<ShopInterface>;
  constructor(private fb: FormBuilder, private shopService: ShopService) {}

  ngOnInit() {
    /* this.birthdayForm.valueChanges.subscribe((data) => {
      if (this.birthdayForm.valid) {
        console.log(
          'date:',
          new Date(`${data.year}-${data.month}-${data.day}`)
        );
      }
    }); */
    this.shop$ = this.shopService.getById(136);
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
