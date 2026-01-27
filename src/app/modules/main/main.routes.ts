import { Routes } from '@angular/router';

export const MAIN_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./home/home.component').then(m => m.HomeComponent)
    },
    {
        path: 'classification',
        loadComponent: () => import('./classification/classification.component').then(m => m.ClassificationComponent)
    },
    {
        path: 'about-us',
        loadComponent: () => import('./about-us/about-us.component').then(m => m.AboutUsComponent)
    }
];
