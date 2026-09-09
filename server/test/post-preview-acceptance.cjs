// 仅运行于本任务空库验收容器；所有身份、帖子、文件均为隔离测试数据。
const assert = require('node:assert/strict')
const fs = require('node:fs')
const crypto = require('node:crypto')
const { PrismaClient } = require('/workspace/server/node_modules/@prisma/client')
const sharp = require('/workspace/server/node_modules/sharp')
assert(process.env.PREVIEW_ACCEPTANCE === 'true' && process.env.DATABASE_URL.endsWith('/post_preview'))
const db = new PrismaClient(), results = [], posts = {}, files = {}
const base = 'http://127.0.0.1:3000/api/v1'
const digest = value => crypto.createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex')
async function api(path, token, method = 'GET', body) {
  const response = await fetch(base + path, { method, headers: { origin: process.env.FRONTEND_URL, ...(token ? { authorization: 'Bearer ' + token } : {}), ...(body instanceof FormData ? {} : { 'content-type': 'application/json' }) }, ...(body === undefined ? {} : { body: body instanceof FormData ? body : JSON.stringify(body) }) })
  const json = await response.json()
  return { status: response.status, data: json.data, message: json.message }
}
async function okay(path, token, method, body) {
  const response = await api(path, token, method, body)
  assert(response.status < 300, `${path}: ${response.status} ${response.message}`)
  return response.data
}
const check = async (name, action) => { await action(); results.push({ name, passed: true }); console.log('PASS ' + name) }
async function main() {
  if (process.env.PREVIEW_ACCEPTANCE_RESET === 'true') await db.$executeRawUnsafe('TRUNCATE TABLE community_posts, files CASCADE')
  assert.equal(await db.communityPost.count(), 0, '必须使用本任务空库')
  const a = await db.user.findUniqueOrThrow({ where: { username: 'post_preview_a' } })
  const b = await db.user.findUniqueOrThrow({ where: { username: 'post_preview_b' } })
  const r = await db.user.findUniqueOrThrow({ where: { username: 'preview_unverified' } })
  const login = async user => (await okay('/auth/login', null, 'POST', { identifier: user.username, password: process.env.BROWSER_PASSWORD })).accessToken
  const [at, bt, rt] = await Promise.all([login(a), login(b), login(r)])
  for (const [name, width, height, color] of [['landscape',800,450,'#406dad'],['portrait',450,800,'#a15e7b'],['long',600,4200,'#388675'],['small',120,80,'#cc9548']]) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${color}"/>${Array.from({length:7}, (_, i)=>`<rect x="20" y="${20+i*(height-40)/7}" width="${width-40}" height="${(height-40)/8}" fill="white" opacity=".15"/><text x="32" y="${50+i*(height-40)/7}" font-size="24" fill="white">${name} ${i+1}</text>`).join('')}</svg>`
    const buffer = await sharp(Buffer.from(svg)).png().toBuffer(), form = new FormData()
    form.set('file', new Blob([buffer], { type: 'image/png' }), name+'.png')
    const uploaded = await okay('/community/media', at, 'POST', form)
    files[name] = { id: uploaded.id, width, height, sha256: digest(buffer) }
  }
  const image = name => ({ type: 'image', fileId: files[name].id, alt: '测试图片 '+name })
  const longText = '学习笔记正文：先理解概念，再完成实践并记录反思。'.repeat(35)
  const specs = {
    short: [{type:'paragraph',text:'一段简短的学习记录。'}],
    paragraphs: [{type:'paragraph',text:longText},{type:'paragraph',text:'\n\n'},{type:'paragraph',text:'下一段原始\n\n换行与最终说明。'}],
    list: [{type:'heading',level:2,text:'实践步骤'}, {type:'list',ordered:true,items:Array.from({length:12},(_,i)=>'步骤 '+(i+1)+'：'+longText.slice(0,35))},{type:'quote',text:'引用说明'}],
    code: [{type:'paragraph',text:'代码之前'},{type:'code',language:'js',code:Array.from({length:30},(_,i)=>`const item${i} = ${i}`).join('\n')},{type:'paragraph',text:'代码之后'}],
    table: [{type:'rich_text',text:'<p>表格之前</p><table><tbody>'+Array.from({length:10},(_,i)=>`<tr><td>第${i+1}行</td><td>详细教学说明</td></tr>`).join('')+'</tbody></table><p>表格之后</p>'}],
    landscape: [image('landscape')], portrait: [image('portrait')], long: [image('long')], small: [image('small')],
    two: [image('landscape'),image('portrait')], three:[image('landscape'),image('portrait'),image('long')],
    four:[{type:'rich_text',text:'<p>第一段说明</p><p>'+longText+'</p>'},image('landscape'),{type:'rich_text',text:'<h2>第二步说明</h2><p><a href="https://example.invalid/lesson">正文链接</a>：保留原始顺序。</p>'},image('portrait'),{type:'paragraph',text:'第三步说明'},image('long'),{type:'paragraph',text:'第四步说明'},image('small'),{type:'paragraph',text:'最终原文说明'}],
  }
  for (const [name, blocks] of Object.entries(specs)) {
    posts[name] = await db.communityPost.create({data:{authorId:a.id,schoolId:a.schoolId,postType:'note',status:'published',visibility:'public',title:'预览验收 '+name,body:JSON.stringify(blocks),plainText:'预览验收 '+name,contentBlocks:blocks,contentHash:digest(blocks),publishedAt:new Date(),impressionCount:name==='four'?12345:0,usefulCount:9}})
  }
  const p = posts.short, counts = () => db.communityPost.findUniqueOrThrow({where:{id:p.id}})
  const ctx = token => okay('/community/feed/view-context',token,'POST',{})
  const confirm = (token, context, postId=p.id, dwellMs=1000) => okay('/community/feed/impressions',token,'POST',{items:[{requestId:context.requestId,postId,dwellMs}]})
  await check('GET列表、详情、搜索、作者页和接口预取不产生浏览',async()=>{
    await okay('/community/posts/'+p.id,bt); await okay('/community/posts',bt)
    await okay('/community/search?q='+encodeURIComponent('预览验收')+'&type=posts',bt)
    await okay('/community/users/'+a.id+'/posts',bt)
    assert.equal((await counts()).impressionCount,0)
  })
  const context = await ctx(bt)
  await check('真实上下文、满一秒、所属用户及过期校验',async()=>{
    assert.equal((await confirm(bt,{requestId:'invented-context'})).items.length,0)
    assert.equal((await confirm(bt,context,p.id,999)).items.length,0)
    assert.equal((await confirm(at,context)).items.length,0)
    const expired = await ctx(bt);await db.communityFeedSession.update({where:{id:expired.requestId},data:{expiresAt:new Date(0)}})
    assert.equal((await confirm(bt,expired)).items.length,0)
    assert.equal((await counts()).impressionCount,0)
  })
  await check('重复与12路并发同一曝光仅增一，返回权威统计',async()=>{
    const responses = await Promise.all(Array.from({length:12},()=>confirm(bt,context)))
    assert(responses.every(row=>row.items[0]?.views===1))
    await confirm(bt,context);assert.equal((await counts()).impressionCount,1)
    assert.equal(await db.communityFeedImpression.count({where:{requestId:context.requestId,postId:p.id,impressedAt:{not:null}}}),1)
    assert.equal((await counts()).usefulCount,9)
    await confirm(bt,await ctx(bt));assert.equal((await counts()).impressionCount,2)
  })
  await check('未实名合法只读用户可浏览，但仍不能点赞',async()=>{
    assert.equal((await confirm(rt,await ctx(rt))).items[0].views,3)
    const media=await okay('/community/media/'+files.landscape.id+'/url',rt)
    const download=await fetch('http://127.0.0.1:3000'+media.url,{headers:{authorization:'Bearer '+rt}})
    assert.equal(download.status,200);assert.equal(digest(Buffer.from(await download.arrayBuffer())),files.landscape.sha256)
    assert.equal((await api('/community/posts/'+p.id+'/reactions/like',rt,'PUT',{})).status,403)
  })
  await check('点赞、收藏及全部展示入口保留浏览量和历史有帮助',async()=>{
    for(const kind of ['like','bookmark'])assert.equal((await okay('/community/posts/'+p.id+'/reactions/'+kind,bt,'PUT',{})).stats.views,3)
    assert.equal((await okay('/community/posts/'+p.id,bt)).stats.views,3)
    const lists=[await okay('/community/posts',bt),await okay('/community/bookmarks',bt),await okay('/community/users/'+a.id+'/posts',bt)]
    for(const list of lists)assert.equal(list.find(row=>row.id===p.id).stats.views,3)
    assert.equal((await okay('/community/search?q='+encodeURIComponent('预览验收 short')+'&type=posts',bt)).posts.find(row=>row.id===p.id).stats.views,3)
    assert.equal((await counts()).usefulCount,9)
  })
  await check('草稿、待审核、删除、异校、隐藏内容均不计数，已有上下文也必须重新检查',async()=>{
    const forbidden=[]
    for(const [name,extra] of [['draft',{status:'draft',publishedAt:null}],['pending',{status:'pending_review'}],['deleted',{deletedAt:new Date()}],['school',{visibility:'school',schoolId:(await db.school.upsert({where:{code:'preview-other'},create:{code:'preview-other',name:'另一学校'},update:{}})).id}]]) {
      const row=await db.communityPost.create({data:{authorId:a.id,postType:'note',status:'published',visibility:'public',title:name,body:name,plainText:name,contentBlocks:[{type:'paragraph',text:name}],contentHash:name,publishedAt:new Date(),...extra}});forbidden.push(row.id)
      assert.equal((await confirm(bt,context,row.id)).items.length,0)
    }
    await okay('/community/posts/'+p.id+'/hide',bt,'POST',{})
    assert.equal((await confirm(bt,context)).items.length,0)
    assert.equal((await db.communityPost.aggregate({where:{id:{in:forbidden}},_sum:{impressionCount:true}}))._sum.impressionCount,0)
    await db.communityFeedback.deleteMany({where:{userId:b.id,targetId:p.id}})
  })
  await check('推荐Feed仅确认已下发帖子，未下发与伪造ID不计数',async()=>{
    const feed=await okay('/community/feed?mode=latest&type=all',bt), post=feed.items.find(row=>row.type==='post').post
    const previous=(await db.communityPost.findUniqueOrThrow({where:{id:post.id}})).impressionCount
    await confirm(bt,feed,post.id);await confirm(bt,feed,post.id)
    assert.equal((await db.communityPost.findUniqueOrThrow({where:{id:post.id}})).impressionCount,previous+1)
    const later=await db.communityPost.create({data:{authorId:a.id,postType:'note',status:'published',visibility:'public',body:'late',plainText:'late',contentBlocks:[{type:'paragraph',text:'late'}],contentHash:'late',publishedAt:new Date()}})
    assert.equal((await confirm(bt,feed,later.id)).items.length,0)
    await db.communityPost.delete({where:{id:later.id}})
  })
  const original={}; for(const [name,post] of Object.entries(posts))original[name]={id:post.id,contentHash:post.contentHash,blocksSha256:digest(post.contentBlocks),views:(await db.communityPost.findUniqueOrThrow({where:{id:post.id}})).impressionCount}
  await okay('/community/posts/'+posts.four.id+'/reactions/bookmark',at,'PUT',{})
  fs.writeFileSync('/tmp/post-preview-fixture.json',JSON.stringify({posts:original,files,authorId:a.id,readerId:r.id,results},null,2))
  await db.$disconnect()
}
main().catch(async error=>{console.error('ACCEPTANCE_FAILED',error.stack);await db.$disconnect();process.exitCode=1})
