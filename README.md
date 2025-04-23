# minimal-publisher
A minimal framework to serve frontmatter markdown. There are many minimal blog apps like this, but this one is mine. 

**Design Philosophy** Convention over configuration - setup takes minutes. Minimal metadata is contained in post files, and derived at runtime.

**Stack:** TypeScript, LiquidJS, Bootstrap

## Setup 

* Install node (v18+) and `npm i`. 
* Add a .env with the minimal configuration described below
* Add a content folder with content in markdown format
* `npm run test|dev|prod` - running prod will transpile `.ts` to `.js`, dev and test use `ts-node`

### .env Config

The .env file requires a CONTENT_DIR AND PORT be configured for one or more of DEV/TEST/PROD
```
SITE_NAME=Jill's Blog
TEST_CONTENT_DIR=./_test-posts
TEST_PORT=3000
DEV_CONTENT_DIR=./_test-posts
DEV_PORT=3001
PROD_CONTENT_DIR=../mycontent_dir
PROD_PORT=443
LINKEDIN_LINK=https://www.linkedin.com/in/my_profile
GITHUB_LINK=https://github.com/MyGithubUsername
```
<ENVIRONMENT>_CONTENT_DIR should be a relative link to the folder containing the markdown content

### Content Directory 

PROD_CONTENT_DIR should point to a directory containing at a minimum: 
*  `home-index.md` 
* `images/hero.jpg`
* `_menu.md`

The 'hero.jpg' is displayed on the home page. 

### Post file structure

Posts musts be naed in a `YYYYMMDD-post-name.md` format. Only lowercase letters, numbers as dashes are permissible in the post name. 

**Metadata** the [`front-matter`](https://jekyllrb.com/docs/front-matter/) convention is used - at the top of each markdown post, add:

```
---
title: Initial Post 
author: John Keats
tags: [tag1, tag2]
---
```

Posts put in **subfolders** will consider each subfolder name as a tag. So any post in a 'politics' subfolder will have 'politics' as a tag whether or not it is added in the front-matter block.

**Images** can have an optional size defined: `![Best viewed on Navigator 6.6](./images/netscape-now.gif =100x20)`


