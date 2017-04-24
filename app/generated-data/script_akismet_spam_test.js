const akismet = require('akismet-api')

const client = akismet.client({
  key  : '80752a748e28', 
  blog : 'http://femto.email'
})

;(async () => {
  let valid = await client.verifyKey()
  console.log(`Is the key valid? ${valid ? 'Yes' : 'No'}`)
  let spam = await client.checkSpam({
    user_ip: '',
    user_agent: 'Nothing',
    referrer: '',
    comment_type: 'email',
    comment_author: '',
    comment_author_email: '',
    comment_content: `What's up, Big Boy?

My name is Violette, what's yours? I can not wait to meet you in private.
I was going to have a nice talk with you in chat but you had gone offline.

May I ask you to write me a few words some day? Trust me, it's going to be lots of fun.
I'll be waiting for your letter...

Do not respond to this message, reply to address vekoroleva1979@rambler.ru



Love and kisses,
Violette
 
`,
    is_test: true
  })
  console.log(`Is it spam? ${spam ? 'Yes' : 'No'}`)
})()