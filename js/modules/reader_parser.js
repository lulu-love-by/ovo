// Reader parsing: bounded, line-based rules; never match across paragraphs.
const CHAPTER_PATTERNS=[
 {key:'AUTO',label:'智能综合（推荐）'},
 {key:'DECORATED',label:'装饰标题（=== / 【】）'},
 {key:'CHINESE_NUM',label:'第X章／回／节／卷'},
 {key:'ENGLISH_CHAPTER',label:'Chapter X'},
 {key:'PURE_DIGIT',label:'数字序号（1. / 1、）'},
 {key:'BRACKETS',label:'括号序号（（一）/ (1)）'},
 {key:'SPECIAL',label:'特殊标识（序言／楔子／番外）'}
];
const READER_NUM='0-9０-９零〇一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾佰仟两';
function parseBookInfo(filename,text=''){
 let name=String(filename).replace(/\.(?:txt|epub|docx)$/i,'').trim(),title=name,author='未知作者';
 const quoted=name.match(/^《([^》]+)》(?:[\s_-]*(?:by|作者\s*[:：]?)?\s*(.*))?$/i);
 if(quoted){title=quoted[1].trim();author=quoted[2]?.trim()||author;}
 else{const m=name.match(/^(.*?)\s*(?:\bby\b|作者\s*[:：]|\s+-\s+)\s*(.+)$/i);if(m){title=m[1].trim();author=m[2].trim();}}
 const front=String(text).slice(0,12000),a=front.match(/^[ \t　]*(?:作[ \t]*者|Author)[ \t]*[:：][ \t]*([^\n\r]{1,60})/im),t=front.match(/^[ \t　]*(?:书名|Title)[ \t]*[:：][ \t]*《?([^\n\r》]{1,100})/im);
 if(author==='未知作者'&&a&&!/有话要说|的话|说[:：]/.test(a[1]))author=a[1].trim();if(t)title=t[1].trim();
 return {title:title||'未命名书籍',author};
}
function readerHeading(line){
 const t=line.replace(/^[\uFEFF\t 　]+|[\t 　]+$/g,'');if(!t||t.length>120)return null;
 let m=t.match(/^(={2,}|-{3,}|\*{3,}|＿{3,}|_{3,}|─{3,}|━{3,})[ \t]*(\S[\s\S]*?)[ \t]*\1$/);
 if(m&&m[2].length<=110&&/[^=*_─━＿\s-]/.test(m[2]))return {kind:'DECORATED',family:m[1][0],title:m[2].trim()};
 m=t.match(/^(?:【([^】\n]{1,70})】|［([^］\n]{1,70})］)$/);if(m)return {kind:'DECORATED',family:'bracket',title:m[1]||m[2]};
 if(t.length>80)return null;
 if(new RegExp('^第['+READER_NUM+']{1,14}[章回节卷部集](?:[\\s:：、.．·-]*[^。！？!?]{0,60})?$').test(t))return {kind:'CHINESE_NUM',title:t};
 if(/^(?:chapter|chap\.?)[ \t]+(?:\d+|[ivxlcdm]+)\b[^。！？!?]{0,60}$/i.test(t))return {kind:'ENGLISH_CHAPTER',title:t};
 if(new RegExp('^[（(]['+READER_NUM+']{1,12}[）)](?:[ \\t:：、.．·-]*[^。！？!?]{0,40})?$').test(t))return {kind:'BRACKETS',title:t};
 if(/^(?:\d{1,5}[.．、][ \t]*\S[^。！？!?]{0,45}|\d{1,5}[ \t]+[^。！？!?]{1,35}|\d{1,5})$/.test(t))return {kind:'PURE_DIGIT',title:t};
 if(new RegExp('^(?:楔子|引子|序言|前言|尾声|终章|后记|番外(?:['+READER_NUM+']{0,8}|[·：: -][^。！？!?]{1,40}))(?:[ \\t:：·-][^。！？!?]{0,40})?$').test(t))return {kind:'SPECIAL',title:t};
 return null;
}
function dominantDecorated(rows){const structural=rows.filter(h=>h.family!=='bracket');return structural.length>=2?structural:rows;}
function parseChapters(raw,patternKey='AUTO'){
 const text=String(raw).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').replace(/[\u2028\u2029]/g,'\n');
 const found=[];let offset=0;
 for(const line of text.split('\n')){const h=readerHeading(line);if(h)found.push({...h,start:offset,end:offset+line.length});offset+=line.length+1;}
 let headings;
 if(patternKey==='AUTO'){
  const wrapped=dominantDecorated(found.filter(h=>h.kind==='DECORATED'));
  // Consistent explicit wrappers are the strongest signal; ignore incidental lists/author notes.
  if(wrapped.length>=2)headings=wrapped;
  else{const strong=found.filter(h=>['CHINESE_NUM','ENGLISH_CHAPTER'].includes(h.kind));headings=strong.length?found.filter(h=>['CHINESE_NUM','ENGLISH_CHAPTER','SPECIAL','DECORATED'].includes(h.kind)):found.filter(h=>h.kind!=='PURE_DIGIT'||found.filter(x=>x.kind==='PURE_DIGIT').length>=3);}
 }else if(patternKey==='DECORATED')headings=dominantDecorated(found.filter(h=>h.kind==='DECORATED'));
 else headings=found.filter(h=>h.kind===patternKey||h.kind==='DECORATED'&&readerHeading(h.title)?.kind===patternKey);
 if(!headings.length)return [{title:'正文',content:text.trim()}];
 const out=[],prefix=text.slice(0,headings[0].start).trim();
 if(prefix.length>120)out.push({title:'前言／简介',content:prefix});
 headings.forEach((h,i)=>{let content=text.slice(h.end,headings[i+1]?.start??text.length).trim();if(i===0&&prefix&&prefix.length<=120)content=prefix+'\n\n'+content;out.push({title:h.title,content});});
 return out;
}
async function readTxtContent(file){const bytes=new Uint8Array(await file.arrayBuffer());if(bytes[0]===0xff&&bytes[1]===0xfe)return new TextDecoder('utf-16le').decode(bytes);if(bytes[0]===0xfe&&bytes[1]===0xff)return new TextDecoder('utf-16be').decode(bytes);let t=new TextDecoder('utf-8').decode(bytes);if(t.includes('\ufffd')){try{const gb=new TextDecoder('gb18030').decode(bytes);if((gb.match(/\ufffd/g)||[]).length<(t.match(/\ufffd/g)||[]).length)t=gb;}catch(_){}}return t.replace(/^\uFEFF/,'');}
async function saveBookToDB(bookInfo, chaptersData) {
    const bookId = 'book_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const bookMeta = {
        id: bookId,
        title: bookInfo.title,
        format: bookInfo.format || "txt",
        highlights: [],description:String(bookInfo.description||'').slice(0,4000),cover:bookInfo.cover||'',coverMode:'pattern',
        author: bookInfo.author,
        totalChapters: chaptersData.length,
        currentChapterIndex: 0,
        scrollProgress: 0,
        addTime: Date.now(),
        lastReadTime: Date.now()
    };

    const chaptersToSave = chaptersData.map((ch, index) => ({
        id: `${bookId}_ch_${index}`,
        bookId: bookId,
        index: index,
        title: ch.title,
        content: ch.content,
        image: ch.image || null
    }));

    await dexieDB.transaction('rw', dexieDB.reader_books, dexieDB.reader_chapters, async () => {
        await dexieDB.reader_books.put(bookMeta);
        await dexieDB.reader_chapters.bulkPut(chaptersToSave);
    });

    return bookId;
}

async function processTxtFile(file,onProgress){onProgress?.(0,'正在读取');const text=await readTxtContent(file),info=parseBookInfo(file.name,text);onProgress?.(70,'正在保存');const id=await saveBookToDB(info,parseChapters(text));onProgress?.(100,'已保存');return id;}
window.readerParser={CHAPTER_PATTERNS,parseBookInfo,parseChapters,readTxtContent,saveBookToDB,processTxtFile,readerHeading};
