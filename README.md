<p align="center">
  <img src="https://domus.la/assets/img/logo/new-logo.png" alt="Domus" width="260">
</p>

# n8n-nodes-domus

n8n community node for [Domus](https://domus.la), the real estate CRM. It reads and writes
properties, owners, advisors, branches, projects, acquisitions, meetings, opportunities,
profiles, and contacts from n8n workflows. Maintained by Domus Tech SAS.

**Stack:** TypeScript · n8n declarative node (`@n8n/node-cli`) · Node 24 · `node --test` ·
Playwright · Docker.

| Document                                                   | Contents                                               |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| [`docs/api-coverage.md`](docs/api-coverage.md)             | Every Domus API 3.0 endpoint and whether the node has it |
| [`docs/testing-strategy.md`](docs/testing-strategy.md)     | Test layers and what each one checks                   |
| [`examples/`](examples/)                                   | 35 importable workflows, one per operation             |
| [`CHANGELOG.md`](CHANGELOG.md)                             | Changes by version                                     |
| [Domus API 3.0](https://apiv3get.domus.la/docs/3.0/)       | Official API docs (inventory)                          |
| [Domus CRM API](https://apind.domus.la/docs)               | Official API docs (meetings, opportunities, profiles)  |

## Installation

The package is on npm as [`n8n-nodes-domus`](https://www.npmjs.com/package/n8n-nodes-domus). `1.0.0`
was verified by n8n through the Creator Portal.

- **n8n Cloud, or self-hosted with verified community nodes:** search **Domus** in the nodes panel.
- **Self-hosted:** _Settings → Community Nodes → Install_ and enter `n8n-nodes-domus`.

## Credentials

The node uses two credentials. Request both tokens from Domus support (soporte@domus.la). The token
goes in the `Authorization` header as is, without `Bearer`.

| Credential        | Resources                                                     | Host                                                                                   | Test request          |
| ----------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------- |
| **Domus API**     | Property, Owner, Advisor, Branch, Project, Acquisition        | Testing `https://newapi.domus.la` or Production `https://api.domus.la/3.0`             | `GET /general/countries` |
| **Domus CRM API** | Meeting, Opportunity, Profile, Contact                        | `https://apind.domus.la`; contacts go to `https://api.domus.la` (API 2.0)              | `GET /meetings/types` |

- **Domus API** has an **Environment** field. Domus resets the testing environment on the first day of
  every month; use production to read real inventory.
- Tokens never go in the repository, `.env` files, fixtures, logs, screenshots, or example workflows.

## Usage

1. Add the **Domus** node to a workflow.
2. Pick a resource and an operation. n8n asks for the credential that resource needs.
3. Run the node. Each record comes out as one n8n item.

Searches have **Return All** (follows `current_page` and `last_page`) or **Limit**. Selectors such as
city, property type, status, advisor, or branch load live options from Domus, and every one also takes
codes by hand (**By Code**). The node can also be used as an AI agent tool.

To start from a working example, import a file from [`examples/`](examples/) and assign your own
credential. The examples have no token or credential ID.

## Operations

36 operations on 10 resources. Writes with forms send `application/x-www-form-urlencoded`.

### Inventory (Domus API credential)

| Resource    | Operation                | Request                                                 |
| ----------- | ------------------------ | ------------------------------------------------------- |
| Property    | Search                   | `GET /properties`                                       |
| Property    | Search Map               | `GET /properties/map`                                   |
| Property    | Get                      | `GET /properties/{codpro}/{idpro?}`                     |
| Property    | Create                   | `POST /properties`                                      |
| Property    | Update                   | `PUT /properties/{codpro}`                              |
| Property    | Get Status History       | `GET /properties/status/{codpro}`                       |
| Property    | Change Status            | `PUT /properties/status/{codpro}`                       |
| Property    | Separate                 | `PUT /properties/detach/{codpro}`                       |
| Property    | Get Portal Publications  | `GET /properties/portals/{idpro}/{codpro?}`             |
| Property    | Retry Portal Publication | `GET /properties/retry-portals/{codpro}/{idpro?}`       |
| Owner       | Search                   | `GET /owners`                                           |
| Owner       | Get                      | `GET /owners/{document}`                                |
| Owner       | Create                   | `POST /owners`                                          |
| Owner       | Update                   | `PUT /owners/{document}`                                |
| Owner       | Unlink Property          | `DELETE /owners/{owner_code}/{codpro}`                  |
| Advisor     | Search                   | `GET /administrative/brokers`                           |
| Advisor     | Create                   | `POST /administrative/brokers`                          |
| Advisor     | Update                   | `PUT /administrative/brokers/{code}`                    |
| Branch      | Search                   | `GET /administrative/branches`                          |
| Project     | Search                   | `GET /projects-v2`                                      |
| Project     | Get                      | `GET /projects-v2/{code}`                               |
| Acquisition | Search                   | `GET /captures-v2`                                      |
| Acquisition | Get                      | `GET /captures-v2/{code}`                               |

- **Properties cannot be deleted.** Use **Change Status** to take one out of inventory, and
  **Separate** to reserve it. Write against the testing host unless you mean to create a live listing.
- **Create** needs city, address, business type, and property type. Domus also asks for rent when the
  business type is 1 or 3, and sale price when it is 2 or 3.
- **Update** does not change the status; that is **Change Status**.
- **Retry Portal Publication** queues a new portal transaction on every call (create, update, or
  unpublish). It is not idempotent.
- **Owner → Get** takes the identification document. Send `0` and set **Owner Code** if you do not have
  it. **Unlink Property** removes the link; the owner stays.
- **Advisor** and **Branch** searches are not paginated by Domus: the API returns the full list and
  **Limit** cuts it inside n8n.
- **Project** and **Acquisition** use the Domus V2 endpoints. For records without a code, send `0` and
  set **Unique Code**. Acquisitions are read-only (the API has no create or update).
- Not included: image upload, the `amenities_extra` JSON body, multilingual descriptions, MLS projects
  (`GET /projects`), partners, and tags. Full list in [`docs/api-coverage.md`](docs/api-coverage.md).

### CRM (Domus CRM API credential)

| Resource    | Operation | Request                         | Required fields                         |
| ----------- | --------- | ------------------------------- | --------------------------------------- |
| Meeting     | Search    | `GET /meetings`                 | Start date, end date                    |
| Meeting     | Get       | `GET /meetings/{meeting_id}`    | Meeting ID                              |
| Meeting     | Create    | `POST /meetings`                | Start date, finish date, notes, type    |
| Meeting     | Update    | `PUT /meetings/{meeting_id}`    | Status, result                          |
| Meeting     | Confirm   | `PUT /meetings/verify/{meeting_id}` | Confirm attendance                  |
| Opportunity | Search    | `GET /opportunities`            | —                                       |
| Opportunity | Get       | `GET /opportunities/{opportunity_id}` | Opportunity ID                    |
| Opportunity | Create    | `POST /opportunities`           | Date, comment, service                  |
| Profile     | Search    | `GET /profiles`                 | —                                       |
| Contact     | Search    | `GET /contacts`                 | —                                       |
| Contact     | Get       | `GET /contacts/{code}`          | Code                                    |
| Contact     | Create    | `POST /contacts`                | Name, source                            |
| Contact     | Update    | `PUT /contacts/{code}`          | Code (sends name, email, description)   |

Contacts live on `https://api.domus.la`; the other CRM resources on `https://apind.domus.la`. None of
these records can be deleted through the API. **Opportunity → Get** includes the follow-ups.

## Compatibility

| Component      | Version                                                        |
| -------------- | -------------------------------------------------------------- |
| n8n            | Tested on 2.35.5 (`docker/compose.yaml`)                       |
| Node version   | `[1, 2]`, default `2`. Workflows saved on version 1 still load |
| Node.js (dev)  | `>=22.22.0 <26`; `.node-version` pins `24.19.0`                |

Node.js 26 is not used for development: `isolated-vm` 6.x, a native dependency of n8n, has no Node.js 26
binding.

## Development

```bash
npm install
npm run dev        # builds, links the node, and opens n8n with hot reload at http://localhost:5678
```

The first run downloads n8n (1-2 minutes) and asks you to create a local owner account.

| Command                               | What it does                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------- |
| `npm run lint` / `npm run lint:fix`   | n8n lint rules                                                                  |
| `npm run build`                       | Compiles to `dist/`                                                             |
| `npm test`                            | Build and unit tests (routing, pagination, locators, examples)                  |
| `npm run test:integration`            | Read-only calls to the real API. Skips without `DOMUS_TEST_TOKEN`               |
| `npm run test:integration:write`      | Writes on `https://newapi.domus.la`. Manual only, needs `DOMUS_TEST_WRITE=1`    |
| `npm run test:integration:crm-write`  | CRM writes. Manual only, needs `DOMUS_CRM_TEST_WRITE=1`                         |
| `npm run test:workflow`               | Runs the example workflows                                                      |
| `npm run test:docker`                 | Packs the `.tgz`, installs it on a clean n8n 2.35.5 (port `5680`) and checks it |
| `npm run test:e2e`                    | Playwright against the Docker n8n (`npm run playwright:install` once)           |
| `npm run docker:down`                 | Removes the Docker container and its volume                                     |

### Environment variables

Only the optional live tests use them. Copy [`.env.example`](.env.example) to `.env` (never committed)
and fill it in; each variable is explained there. `DOMUS_TEST_TOKEN` must be a testing token, not a
production one, and write tests refuse any host other than `https://newapi.domus.la`.

### CI

`ci.yml` runs lint, build, unit tests, and `npm pack --dry-run` on every PR. `nightly.yml` runs every day
at 07:00 UTC: unit, Docker, Playwright, live read-only, and workflow tests, with the `DOMUS_TEST_TOKEN`
and `DOMUS_CRM_TEST_TOKEN` repository secrets. The write cycle only runs by hand
(_Actions → Nightly → Run workflow_ with `write_tests`).

### Conventions

- Main branch: `main`. Changes go in through pull requests.
- Branch names: `feature/...`, `fix/...`, `docs/...`.
- Secrets never go in the repository; they live in GitHub Secrets.

## Release

```bash
npm run release
```

It lints, builds, bumps the version, updates the changelog, commits, and pushes the tag. The tag
triggers `publish.yml`, which publishes to npm with provenance. n8n requires that provenance, so this
repository must stay public.

## License

[MIT](LICENSE).

Domus Tech SAS · [domus.la](https://domus.la) · soporte@domus.la
