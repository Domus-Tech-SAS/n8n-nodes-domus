import { type APIRequestContext, type Locator, type Page, expect } from '@playwright/test';
import { configuredPropertyCode, domusBaseURL, domusCrmToken, domusToken } from './env';

const jsonHeaders = {
	Accept: 'application/json',
	'Content-Type': 'application/json',
};

const unwrap = <T>(payload: unknown): T => {
	if (payload && typeof payload === 'object' && 'data' in payload) {
		return (payload as { data: T }).data;
	}
	return payload as T;
};

export async function ensureOwner(page: Page): Promise<void> {
	await page.goto('/workflow/new', { waitUntil: 'domcontentloaded' });
	await dismissOnboarding(page);

	if (
		await page
			.getByText(/add first step/i)
			.isVisible()
			.catch(() => false)
	) {
		return;
	}

	const signIn = page.getByRole('button', { name: /^sign in$/i });
	if (await signIn.isVisible().catch(() => false)) {
		throw new Error('n8n session is missing; delete test-results/e2e/.auth.json and rerun');
	}
}

export async function openBlankWorkflow(page: Page): Promise<void> {
	await page.goto('/workflow/new', { waitUntil: 'domcontentloaded' });
	await dismissOnboarding(page);

	const canvas = page
		.getByTestId('canvas')
		.or(page.getByTestId('canvas-wrapper'))
		.or(page.locator('.vue-flow, .vue-flow__pane, [data-test-id="rf-wrapper"]'))
		.or(page.getByText(/add first step/i));

	await expect(canvas.first()).toBeVisible({ timeout: 20_000 });
}

async function dismissOnboarding(page: Page): Promise<void> {
	const candidates = [
		page.getByRole('button', { name: /skip|cierra|close|got it|continue/i }),
		page.getByTestId('skip-personalization'),
		page.getByTestId('close-button'),
	];

	for (const locator of candidates) {
		if (
			await locator
				.first()
				.isVisible()
				.catch(() => false)
		) {
			await locator
				.first()
				.click({ timeout: 2_000 })
				.catch(() => undefined);
		}
	}
}

export async function openNodeCreator(page: Page): Promise<void> {
	const firstStep = page.getByRole('group').filter({ hasText: /add first step/i });
	await expect(firstStep).toBeVisible();
	await firstStep.click();

	// The nodes panel can take a moment to open after the click, so wait for its
	// search bar before falling back to the "Open nodes panel" button.
	const search = page.getByTestId('node-creator-search-bar');
	const opened = await search
		.waitFor({ state: 'visible', timeout: 5_000 })
		.then(() => true)
		.catch(() => false);
	if (!opened) {
		await page.getByRole('button', { name: /open nodes panel/i }).click({ force: true });
	}

	await expect(search).toBeVisible();
}

export async function searchDomusInCreator(page: Page): Promise<void> {
	await openNodeCreator(page);
	const search = page.getByTestId('node-creator-search-bar');
	await expect(search).toBeVisible();
	await search.fill('Domus');
	await expect(page.getByText(/interact with domus properties/i).first()).toBeVisible();

	const actionsVisible = await page
		.getByText(/search properties/i)
		.first()
		.isVisible()
		.catch(() => false);
	if (!actionsVisible) {
		await page.getByText('Domus', { exact: true }).first().click();
	}

	await expect(page.getByText(/search properties/i).first()).toBeVisible();
	await expect(page.getByText(/get a property/i).first()).toBeVisible();
	await expect(page.getByText(/get property status history/i).first()).toBeVisible();
	await expect(page.getByText(/change property status/i).first()).toBeVisible();
}

export async function addDomusNode(
	page: Page,
	action:
		| 'Search properties'
		| 'Search properties on a map'
		| 'Get a property'
		| 'Create a property'
		| 'Update a property'
		| 'Get property status history'
		| 'Change property status'
		| 'Separate a property'
		| 'Unlink an owner from a property'
		| 'Create an advisor'
		| 'Update an advisor'
		| 'Search branches' = 'Search properties',
): Promise<void> {
	await searchDomusInCreator(page);
	await page.getByText(action, { exact: true }).click();
}

export async function expectDomusNodeOpen(page: Page): Promise<void> {
	const panel = page
		.getByTestId('ndv')
		.or(page.getByTestId('node-details-view'))
		.or(page.getByText('Property', { exact: true }));
	await expect(panel.first()).toBeVisible();
	await expect(page.getByText('Property').first()).toBeVisible();
}

export async function createDomusCredentialViaApi(
	request: APIRequestContext,
	name = `Domus E2E ${Date.now()}`,
): Promise<string> {
	if (!domusToken) {
		throw new Error('DOMUS_TEST_TOKEN is required to create a live credential');
	}

	const response = await request.post('/rest/credentials', {
		headers: jsonHeaders,
		data: {
			name,
			type: 'domusApi',
			data: {
				token: domusToken,
				environment: domusBaseURL,
			},
		},
	});

	if (!response.ok()) {
		throw new Error(`Creating Domus credential failed with HTTP ${response.status()}`);
	}

	const payload = unwrap<{ id?: string }>(await response.json());
	if (!payload?.id) {
		throw new Error('n8n did not return a credential id');
	}

	return String(payload.id);
}

export async function searchDomusCrmInCreator(page: Page): Promise<void> {
	await openNodeCreator(page);
	const search = page.getByTestId('node-creator-search-bar');
	await expect(search).toBeVisible();
	await search.fill('Domus');

	const actionsVisible = await page
		.getByText('Search meetings', { exact: true })
		.first()
		.isVisible()
		.catch(() => false);
	if (!actionsVisible) {
		await page.getByText('Domus', { exact: true }).first().click();
	}

	await expect(page.getByText('Search meetings', { exact: true }).first()).toBeVisible();
	await expect(page.getByText('Get a meeting', { exact: true }).first()).toBeVisible();
	await expect(page.getByText('Create a meeting', { exact: true }).first()).toBeVisible();
	await expect(page.getByText('Update a meeting', { exact: true }).first()).toBeVisible();
	await expect(page.getByText('Confirm a meeting', { exact: true }).first()).toBeVisible();
	await expect(page.getByText('Search opportunities', { exact: true }).first()).toBeVisible();
	await expect(page.getByText('Get an opportunity', { exact: true }).first()).toBeVisible();
	await expect(page.getByText('Create an opportunity', { exact: true }).first()).toBeVisible();
	await expect(page.getByText('Search profiles', { exact: true }).first()).toBeVisible();
	await expect(page.getByText('Search contacts', { exact: true }).first()).toBeVisible();
	await expect(page.getByText('Get a contact', { exact: true }).first()).toBeVisible();
	await expect(page.getByText('Create a contact', { exact: true }).first()).toBeVisible();
	await expect(page.getByText('Update a contact', { exact: true }).first()).toBeVisible();
}

export async function addDomusCrmNode(
	page: Page,
	action:
		| 'Search meetings'
		| 'Get a meeting'
		| 'Create a meeting'
		| 'Update a meeting'
		| 'Confirm a meeting'
		| 'Search opportunities'
		| 'Get an opportunity'
		| 'Create an opportunity'
		| 'Search profiles'
		| 'Search contacts'
		| 'Get a contact'
		| 'Create a contact'
		| 'Update a contact' = 'Search meetings',
): Promise<void> {
	await searchDomusCrmInCreator(page);
	await page.getByText(action, { exact: true }).click();
}

export async function expectDomusCrmNodeOpen(page: Page): Promise<void> {
	const panel = page.getByTestId('ndv');
	await expect(panel).toBeVisible();
	await expect(panel.getByTestId('parameter-input-resource').getByRole('combobox')).toHaveValue(
		'Meeting',
	);
	await expect(panel.getByText('Start Date', { exact: true })).toBeVisible();
}

export type DomusCredentialRef = {
	id: string;
	name: string;
};

export async function createDomusCrmCredentialViaApi(
	request: APIRequestContext,
	name = `Domus CRM E2E ${Date.now()}`,
): Promise<DomusCredentialRef> {
	if (!domusCrmToken) {
		throw new Error('DOMUS_CRM_TEST_TOKEN is required to create a live CRM credential');
	}
	if (domusToken && domusCrmToken === domusToken) {
		throw new Error('DOMUS_CRM_TEST_TOKEN must be different from DOMUS_TEST_TOKEN');
	}

	const response = await request.post('/rest/credentials', {
		headers: jsonHeaders,
		data: {
			name,
			type: 'domusCrmApi',
			data: {
				token: domusCrmToken,
			},
		},
	});

	if (!response.ok()) {
		throw new Error(`Creating Domus CRM credential failed with HTTP ${response.status()}`);
	}

	const payload = unwrap<{ id?: string }>(await response.json());
	if (!payload?.id) {
		throw new Error('n8n did not return a credential id');
	}

	return { id: String(payload.id), name };
}

const credentialLabel = async (select: Locator): Promise<string> =>
	select.evaluate((root) => {
		const input = root.querySelector('input');
		const value = input instanceof HTMLInputElement ? input.value.trim() : '';
		const selectedText = Array.from(
			root.querySelectorAll('.el-select__selected-item, .el-select__placeholder'),
		)
			.map((element) => element.textContent?.trim() ?? '')
			.join(' ');
		return `${value}\n${selectedText}`;
	});

const waitForCredentialSelection = async (
	page: Page,
	select: Locator,
	credentialName: string,
	timeoutMs: number,
): Promise<boolean> => {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const label = await credentialLabel(select).catch(() => '');
		if (label.includes(credentialName)) return true;
		await page.waitForTimeout(200);
	}
	return false;
};

export async function selectCredentialOnOpenNode(
	page: Page,
	credential: DomusCredentialRef,
): Promise<void> {
	const ndv = page.getByTestId('ndv');
	const select = ndv.getByTestId('node-credentials-select');
	const emptyState = ndv.getByTestId('node-credentials-empty-state');
	await expect(select.or(emptyState).first()).toBeVisible();
	await expect(select).toBeVisible({ timeout: 15_000 });

	const alreadySelected = await waitForCredentialSelection(page, select, credential.name, 5_000);
	if (alreadySelected) return;

	await select.click();
	const option = page.getByTestId(`node-credentials-select-item-${credential.id}`);
	await expect(option).toBeVisible({ timeout: 10_000 });
	await option.click();

	const selected = await waitForCredentialSelection(page, select, credential.name, 10_000);
	if (!selected) {
		throw new Error(`Could not select the Domus CRM credential "${credential.name}" on the node.`);
	}
}

export async function discoverPropertyCode(
	request: APIRequestContext,
): Promise<string | undefined> {
	if (configuredPropertyCode) return configuredPropertyCode;
	if (!domusToken) return undefined;

	const response = await request.get(`${domusBaseURL.replace(/\/$/, '')}/properties`, {
		headers: {
			Accept: 'application/json',
			Authorization: domusToken,
			Inmobiliaria: '1',
			Perpage: '1',
		},
	});

	if (!response.ok()) return undefined;
	const payload = unwrap<{ data?: Array<{ codpro?: string | number }> }>(await response.json());
	const first = Array.isArray(payload?.data) ? payload.data[0] : undefined;
	return first?.codpro !== undefined ? String(first.codpro) : undefined;
}

const EXECUTION_OUTCOME_TIMEOUT_MS = 30_000;

const redactSecrets = (text: string): string => {
	let redacted = text;
	for (const secret of [domusToken, domusCrmToken]) {
		if (secret.length >= 4) {
			redacted = redacted.split(secret).join('[redacted]');
		}
	}

	return redacted
		.replace(/authorization["']?\s*[:=]\s*["']?[^\s"',}]+/gi, 'authorization: [redacted]')
		.replace(/"(?:token|authorization)"\s*:\s*"[^"]*"/gi, '"token":"[redacted]"')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 700);
};

const isMeetingOrOpportunity404 = (resource: string, visibleError: string): boolean => {
	const normalizedResource = resource.trim().toLowerCase();
	const aboutMeetingsOrOpportunities =
		normalizedResource === 'meeting' ||
		normalizedResource === 'opportunity' ||
		/\/meetings\b|\/opportunities\b|meetings\/types/i.test(visibleError);
	const is404 = /\b404\b/.test(visibleError) || /could not be found/i.test(visibleError);
	return aboutMeetingsOrOpportunities && is404;
};

const executionFailureMessage = (resource: string, visibleError: string): string => {
	const cleaned = redactSecrets(visibleError);
	if (isMeetingOrOpportunity404(resource, cleaned)) {
		return [
			'Permissions error: the Domus CRM call returned 404 for meetings or opportunities.',
			'A token without those permissions (for example an Asesor role) gets 404 on /meetings/types and /opportunities. This is a permissions issue. An Administrador-role token is required.',
			`Visible error: ${cleaned || '(no error text)'}`,
		].join(' ');
	}

	return `Domus node execution failed. Visible error: ${cleaned || '(no error text)'}`;
};

const readVisibleError = async (page: Page): Promise<string> => {
	const chunks: string[] = [];
	const output = page.getByTestId('ndv').getByTestId('ndv-output-panel');
	const nodeError = output.getByTestId('node-error-message');
	if (await nodeError.isVisible().catch(() => false)) {
		chunks.push((await output.evaluate((element) => element.textContent ?? '')) ?? '');
	}

	const toast = page.locator('.el-notification').filter({ hasText: /problem in node/i });
	if ((await toast.count()) > 0) {
		chunks.push((await toast.first().textContent()) ?? '');
	} else {
		const problem = page.getByText(/problem in node/i).first();
		if (await problem.isVisible().catch(() => false)) {
			const alertText = await problem
				.locator('xpath=ancestor-or-self::*[@role="alert"][1]')
				.textContent()
				.catch(() => '');
			chunks.push(alertText ?? '');
			chunks.push((await problem.textContent()) ?? '');
		}
	}

	const modal = page.getByTestId('editCredential-modal');
	if (await modal.isVisible().catch(() => false)) {
		chunks.push((await modal.textContent()) ?? '');
	}

	const missingCredential = page.getByText(/credentials for .+ are not set/i).first();
	if (await missingCredential.isVisible().catch(() => false)) {
		chunks.push((await missingCredential.textContent()) ?? '');
	}

	return chunks.join(' ');
};

const executionErrorVisible = async (page: Page): Promise<boolean> => {
	const ndv = page.getByTestId('ndv');
	const output = ndv.getByTestId('ndv-output-panel');
	if (
		await output
			.getByTestId('node-error-message')
			.isVisible()
			.catch(() => false)
	)
		return true;
	if (
		await page
			.getByText(/problem in node/i)
			.first()
			.isVisible()
			.catch(() => false)
	)
		return true;
	if (
		await page
			.getByTestId('editCredential-modal')
			.isVisible()
			.catch(() => false)
	)
		return true;
	if (
		await ndv
			.getByTestId('setup-credential-button')
			.isVisible()
			.catch(() => false)
	)
		return true;
	if (
		await page
			.getByText(/credentials for .+ are not set/i)
			.first()
			.isVisible()
			.catch(() => false)
	) {
		return true;
	}
	return false;
};

export async function executeOpenNode(page: Page): Promise<void> {
	const ndv = page.getByTestId('ndv');
	await expect(ndv).toBeVisible();

	// The canvas Execute step button sits behind the open node panel and
	// cannot receive the click. Use the button in the panel header.
	const execute = ndv.getByTestId('node-execute-button');
	await expect(execute).toBeVisible();
	await expect(execute).toBeEnabled();
	await execute.click();

	const output = ndv.getByTestId('ndv-output-panel');
	const success = output.getByTestId('run-data-item-count').or(output.getByText(/no output data/i));
	const errorState = output
		.getByTestId('node-error-message')
		.or(page.getByText(/problem in node/i))
		.or(page.getByTestId('editCredential-modal'))
		.or(ndv.getByTestId('setup-credential-button'))
		.or(page.getByText(/credentials for .+ are not set/i));

	const finished = await success
		.or(errorState)
		.first()
		.waitFor({ state: 'visible', timeout: EXECUTION_OUTCOME_TIMEOUT_MS })
		.then(() => true)
		.catch(() => false);

	if (!finished) {
		throw new Error(
			'Timed out after 30s waiting for node output or an error state (item count, no output data, problem in node, node error, or a credential prompt).',
		);
	}

	if (await executionErrorVisible(page)) {
		const resource = await ndv
			.getByTestId('parameter-input-resource')
			.getByRole('combobox')
			.inputValue()
			.catch(() => '');
		throw new Error(executionFailureMessage(resource, await readVisibleError(page)));
	}
}
