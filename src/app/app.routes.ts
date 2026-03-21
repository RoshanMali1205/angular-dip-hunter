import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
	// Auth routes (public - only accessible when NOT logged in)
	{
		path: 'auth',
		loadComponent: () =>
			import('./features/auth/auth-layout.component').then(
				(m) => m.AuthLayoutComponent
			),
		canActivate: [guestGuard],
		children: [
			{
				path: 'login',
				loadComponent: () =>
					import('./features/auth/login/login.page').then(
						(m) => m.LoginPageComponent
					),
				title: 'Login - Dip Hunter'
			},
			{
				path: 'register',
				loadComponent: () =>
					import('./features/auth/register/register.page').then(
						(m) => m.RegisterPageComponent
					),
				title: 'Register - Dip Hunter'
			},
			{ path: '', redirectTo: 'login', pathMatch: 'full' }
		]
	},

	// Protected routes (require authentication)
	{
		path: '',
		loadComponent: () =>
			import('./features/dashboard/dashboard.page').then(
				(m) => m.DashboardPageComponent
			),
		canActivate: [authGuard],
		title: 'Dashboard'
	},
	{
		path: 'folders',
		loadComponent: () =>
			import('./features/folders/folders.page').then(
				(m) => m.FoldersPageComponent
			),
		canActivate: [authGuard],
		title: 'Folders'
	},
	{
		path: 'planner',
		loadComponent: () =>
			import('./features/planner/planner.page').then(
				(m) => m.PlannerPageComponent
			),
		canActivate: [authGuard],
		title: 'Planner'
	},
	{
		path: 'transactions',
		loadComponent: () =>
			import('./features/transactions/transactions.page').then(
				(m) => m.TransactionsPageComponent
			),
		canActivate: [authGuard],
		title: 'Transactions'
	},
	{
		path: 'analytics',
		loadComponent: () =>
			import('./features/analytics/analytics.page').then(
				(m) => m.AnalyticsPageComponent
			),
		canActivate: [authGuard],
		title: 'Analytics'
	},
	{
		path: 'performance',
		loadComponent: () =>
			import('./features/performance/performance.page').then(
				(m) => m.PerformancePageComponent
			),
		canActivate: [authGuard],
		title: 'Performance'
	},
	{
		path: 'settings',
		loadComponent: () =>
			import('./features/settings/settings.page').then(
				(m) => m.SettingsPageComponent
			),
		canActivate: [authGuard],
		title: 'Settings'
	},
	{ path: '**', redirectTo: '' }
];
