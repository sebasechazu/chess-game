import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-game-mode-card',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, RouterLink],
    template: `
    <div
        class="group relative overflow-hidden rounded-[2.5rem] bg-white p-10 shadow-2xl shadow-app-muted/20 border-2 border-transparent hover:border-app-accent/30 transition-all duration-500 cursor-pointer h-full">
        
        <!-- Background Icon Decorator -->
        <div class="absolute -right-16 -bottom-16 opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-110 transition-all duration-700">
            <svg class="w-80 h-80 text-gunmetal" fill="currentColor" viewBox="0 0 24 24">
                @if (type() === 'pvp') {
                    <path d="M12 1L9 9h6l-3-8zm0 21l3-8H9l3 8zm-8-9l8-3v6l-8-3zm16-3l-8 3v-6l8 3z" />
                } @else {
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                    <circle cx="12" cy="12" r="3" />
                }
            </svg>
        </div>

        <div class="relative z-10 text-left flex flex-col h-full">
            <!-- Icon Badge -->
            <div [class]="iconBadgeClass()" 
                 class="w-20 h-20 rounded-3xl flex items-center justify-center mb-8 border shadow-inner transition-transform"
                 [class.group-hover:rotate-6]="type() === 'pvp'"
                 [class.group-hover:-rotate-6]="type() === 'pvai'">
                <svg class="w-10 h-10" [class]="iconClass()" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg">
                    @if (type() === 'pvp') {
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                    } @else {
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    }
                </svg>
            </div>

            <h2 class="text-3xl font-extrabold mb-4 text-text-primary">{{ title() }}</h2>
            <p class="text-text-secondary mb-10 text-lg font-medium leading-relaxed grow">
                {{ description() }}
            </p>
            
            <a [routerLink]="['/game']" [queryParams]="{ mode: type() }"
                [class]="buttonClass()"
                class="inline-flex items-center px-8 py-4 font-black rounded-2xl hover:translate-y-[-4px] hover:shadow-xl transition-all duration-300 w-fit">
                {{ buttonText() }}
                <svg class="w-6 h-6 ml-3 transition-transform" [class.group-hover:translate-x-1]="type() === 'pvp'" [class.group-hover:rotate-12]="type() === 'pvai'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    @if (type() === 'pvp') {
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                    } @else {
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    }
                </svg>
            </a>
        </div>
    </div>
  `
})
export class GameModeCardComponent {
    type = input.required<'pvp' | 'pvai'>();
    title = input.required<string>();
    description = input.required<string>();
    buttonText = input.required<string>();

    iconBadgeClass() {
        return this.type() === 'pvp'
            ? 'bg-app-accent/10 border-app-accent/20'
            : 'bg-app-muted/10 border-app-muted/20';
    }

    iconClass() {
        return this.type() === 'pvp' ? 'text-app-accent' : 'text-text-primary';
    }

    buttonClass() {
        return this.type() === 'pvp'
            ? 'bg-app-accent text-gunmetal hover:shadow-app-accent/30'
            : 'border-2 border-gunmetal text-gunmetal hover:bg-gunmetal hover:text-white';
    }
}
