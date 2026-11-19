const assert = require('node:assert/strict');
const test = require('node:test');
const app = require('../server');
const alternateApp = require('../public/app');
const { db, initDb } = require('../db/sequelize');

const servers = [];
let appUrls;

async function startApp(expressApp) {
    const server = expressApp.listen(0);
    await new Promise((resolve, reject) => {
        server.once('listening', resolve);
        server.once('error', reject);
    });
    servers.push(server);
    return `http://127.0.0.1:${server.address().port}`;
}

async function createAuthenticatedUser(baseUrl) {
    const suffix = Date.now();
    const username = `comment-user-${suffix}`;
    const password = 'Test-password-123';
    const response = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            username,
            password,
            passwordConfirmation: password
        }),
        redirect: 'manual'
    });
    assert.equal(response.status, 302);

    const cookie = response.headers.get('set-cookie').split(';')[0];
    const user = await db.User.findOne({ where: { username } });
    return { user, cookie };
}

test.before(async () => {
    await initDb();
    appUrls = await Promise.all([startApp(app), startApp(alternateApp)]);
});

test.after(async () => {
    await Promise.all(servers.map(server => new Promise((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
    })));
    await db.sequelize.close();
});

for (const [name, baseUrl] of [['main', () => appUrls[0]], ['alternate', () => appUrls[1]]]) {
    test(`${name} server renders the homepage`, async () => {
        const response = await fetch(`${baseUrl()}/`);
        assert.equal(response.status, 200);
        assert.match(await response.text(), /Ahoj, já jsem Vývojář!/);
    });

    test(`${name} server renders the about page`, async () => {
        const response = await fetch(`${baseUrl()}/about`);
        assert.equal(response.status, 200);
        assert.match(await response.text(), /O projektu \/ About/);
    });

    test(`${name} server returns 404 for unknown pages`, async () => {
        const response = await fetch(`${baseUrl()}/does-not-exist`);
        assert.equal(response.status, 404);
    });
}

test('comments can be added, displayed, and deleted', async () => {
    const { user, cookie } = await createAuthenticatedUser(appUrls[0]);
    const commentText = `Saved comment ${Date.now()}`;
    const post = await db.Post.create({
        title: `Comment test ${Date.now()}`,
        content: 'Temporary post used by the comment test',
        author: user.username,
        userId: user.id
    });

    try {
        const createResponse = await fetch(`${appUrls[0]}/posts/${post.id}/comments`, {
            method: 'POST',
            headers: {
                cookie,
                'content-type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({ content: commentText }),
            redirect: 'manual'
        });
        assert.equal(createResponse.status, 302);

        const detailResponse = await fetch(`${appUrls[0]}/posts/${post.id}`);
        assert.match(await detailResponse.text(), new RegExp(commentText));

        const comment = await db.Comment.findOne({ where: { postId: post.id } });
        const deleteResponse = await fetch(`${appUrls[0]}/posts/${post.id}/comments/${comment.id}/delete`, {
            method: 'POST',
            headers: { cookie },
            redirect: 'manual'
        });
        assert.equal(deleteResponse.status, 302);

        const afterDeleteResponse = await fetch(`${appUrls[0]}/posts/${post.id}`);
        assert.doesNotMatch(await afterDeleteResponse.text(), new RegExp(commentText));
    } finally {
        await db.Comment.destroy({ where: { postId: post.id } });
        await post.destroy();
        await user.destroy();
    }
});

test('users can register, log in, log out, and delete their account content', async () => {
    const suffix = Date.now();
    const username = `test-user-${suffix}`;
    const password = 'Test-password-123';
    let user;
    let post;
    let cookie;

    try {
        const registerResponse = await fetch(`${appUrls[0]}/auth/register`, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                username,
                password,
                passwordConfirmation: password
            }),
            redirect: 'manual'
        });
        assert.equal(registerResponse.status, 302);
        cookie = registerResponse.headers.get('set-cookie').split(';')[0];

        user = await db.User.findOne({ where: { username } });
        assert.ok(user);
        assert.notEqual(user.passwordHash, password);

        const accountResponse = await fetch(`${appUrls[0]}/account`, {
            headers: { cookie }
        });
        assert.equal(accountResponse.status, 200);
        assert.match(await accountResponse.text(), new RegExp(username));

        const postResponse = await fetch(`${appUrls[0]}/posts`, {
            method: 'POST',
            headers: {
                cookie,
                'content-type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({ title: `User post ${suffix}`, content: 'Owned post content' }),
            redirect: 'manual'
        });
        assert.equal(postResponse.status, 302);
        post = await db.Post.findOne({ where: { userId: user.id } });
        assert.ok(post);

        const commentResponse = await fetch(`${appUrls[0]}/posts/${post.id}/comments`, {
            method: 'POST',
            headers: {
                cookie,
                'content-type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({ content: 'Owned comment content' }),
            redirect: 'manual'
        });
        assert.equal(commentResponse.status, 302);

        const logoutResponse = await fetch(`${appUrls[0]}/auth/logout`, {
            method: 'POST',
            headers: { cookie },
            redirect: 'manual'
        });
        assert.equal(logoutResponse.status, 302);
        const loggedOutResponse = await fetch(`${appUrls[0]}/account`, {
            headers: { cookie },
            redirect: 'manual'
        });
        assert.equal(loggedOutResponse.status, 302);

        const loginResponse = await fetch(`${appUrls[0]}/auth/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ username, password }),
            redirect: 'manual'
        });
        assert.equal(loginResponse.status, 302);
        cookie = loginResponse.headers.get('set-cookie').split(';')[0];

        const wrongPasswordResponse = await fetch(`${appUrls[0]}/account/delete`, {
            method: 'POST',
            headers: {
                cookie,
                'content-type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({ password: 'wrong-password' }),
            redirect: 'manual'
        });
        assert.equal(wrongPasswordResponse.status, 400);

        const deleteResponse = await fetch(`${appUrls[0]}/account/delete`, {
            method: 'POST',
            headers: {
                cookie,
                'content-type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({ password }),
            redirect: 'manual'
        });
        assert.equal(deleteResponse.status, 302);
        assert.equal(await db.User.count({ where: { id: user.id } }), 0);
        assert.equal(await db.Post.count({ where: { userId: user.id } }), 0);
        assert.equal(await db.Comment.count({ where: { userId: user.id } }), 0);
        assert.equal(await db.Comment.count({ where: { postId: post.id } }), 0);
    } finally {
        if (user && await db.User.findByPk(user.id)) {
            await db.Comment.destroy({ where: { userId: user.id } });
            if (post) {
                await db.Comment.destroy({ where: { postId: post.id } });
                await db.Post.destroy({ where: { id: post.id } });
            }
            await db.User.destroy({ where: { id: user.id } });
        }
    }
});
