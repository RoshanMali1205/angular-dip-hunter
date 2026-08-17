import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
	{
		path: 'auth',
		loadComponent: () =>
			import('./features/auth/auth-layout.component').then(
				(m) => m.AuthLayoutComponent
			),
		children: [
			{
				path: 'callback',
				loadComponent: () =>
					import('./features/auth/callback/auth-callback.page').then(
						(m) => m.AuthCallbackPageComponent
					),
				title: 'Signing in - Dip Hunter'
			},
			{
				path: 'reset-password',
				loadComponent: () =>
					import('./features/auth/reset-password/reset-password.page').then(
						(m) => m.ResetPasswordPageComponent
					),
				title: 'Reset Password - Dip Hunter'
			},
			{
				path: 'login',
				loadComponent: () =>
					import('./features/auth/login/login.page').then(
						(m) => m.LoginPageComponent
					),
				canActivate: [guestGuard],
				title: 'Login - Dip Hunter'
			},
			{
				path: 'register',
				loadComponent: () =>
					import('./features/auth/register/register.page').then(
						(m) => m.RegisterPageComponent
					),
				canActivate: [guestGuard],
				title: 'Register - Dip Hunter'
			},
			{
				path: 'forgot-password',
				loadComponent: () =>
					import('./features/auth/forgot-password/forgot-password.page').then(
						(m) => m.ForgotPasswordPageComponent
					),
				canActivate: [guestGuard],
				title: 'Forgot Password - Dip Hunter'
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
		path: 'drafts',
		loadComponent: () =>
			import('./features/drafts/drafts.page').then(
				(m) => m.DraftsPageComponent
			),
		canActivate: [authGuard],
		title: 'Drafts'
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
