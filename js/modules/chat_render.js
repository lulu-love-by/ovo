// --- 消息渲染模块 ---

function renderMessages(isLoadMore = false, forceScrollToBottom = false, options = {}) {
    const chat = (currentChatType === 'private') ? db.characters.find(c => c.id === currentChatId) : db.groups.find(g => g.id === currentChatId);
    if (!chat || !chat.history) return;
    const viewKey95 = JSON.stringify([currentChatType,currentChatId,chat.activeArchiveId||'']);
    messageArea.dataset.translationOwner95=viewKey95;
    const oldScrollHeight = messageArea.scrollHeight;
    const totalMessages = chat.history.length;
    
    // 确保 MESSAGES_PER_PAGE 存在
    const pageSize = (typeof MESSAGES_PER_PAGE !== 'undefined') ? MESSAGES_PER_PAGE : 20;

    const loadedPages = !isLoadMore ? Math.max(1, Number(options.loadedPages) || 1) : 1;
    const range110 = window.UwUHistoryJump110?.chatId === currentChatId && window.UwUHistoryJump110?.type === currentChatType ? window.UwUHistoryJump110 : null;
    const anchor110 = range110 && isLoadMore ? Array.from(messageArea.querySelectorAll('.message-wrapper[data-id]')).find(row => row.getBoundingClientRect().bottom >= messageArea.getBoundingClientRect().top) : null;
    const anchorTop110 = anchor110?.getBoundingClientRect().top;
    const oldTop110 = messageArea.scrollTop;
    let end = loadedPages > 1 ? totalMessages : totalMessages - (currentPage - 1) * pageSize;
    let start = Math.max(0, end - pageSize * loadedPages);
    if (range110) {
      if (isLoadMore && options.historyDirection === 'older') {
        end = range110.start; start = Math.max(0, end - pageSize); range110.start = start;
      } else if (isLoadMore && options.historyDirection === 'newer') {
        start = range110.end; end = Math.min(totalMessages, start + pageSize); range110.end = end;
      } else { start = range110.start; end = Math.min(totalMessages, range110.end); }
    }
    const messagesToRender = chat.history.slice(start, end);
    if (!isLoadMore) messageArea.innerHTML = '';
    const fragment = document.createDocumentFragment();
    
    let lastMsgTime = 0;
    
    if (start > 0) {
        lastMsgTime = chat.history[start - 1].timestamp;
    }

    // 分页刚好切在思维链与第一条回复之间时，仍把按钮放在回复上方。
    if (db.inlineThinkingEnabled && start > 0 && messagesToRender[0]?.role === 'assistant'
        && !messagesToRender[0]?.isThinking && chat.history[start - 1]?.isThinking) {
        fragment.appendChild(window.SmartMessaging.thinkingElement(chat.history[start - 1]));
    }
    messagesToRender.forEach((msg, index) => {
        const currentMsgTime = msg.timestamp;
        const timeDiff = currentMsgTime - lastMsgTime;
        const isSameDay = new Date(currentMsgTime).toDateString() === new Date(lastMsgTime).toDateString();
        
        let isContinuous = false;
        
        let invisibleRegex;
        const momentsRegex = /\[(?:.*?)\s*(?:发布了一条(?:带图)?动态|评论了.*?|回复.*?|更新了个性签名)[：:][\s\S]+?\]/;
        if (chat.showStatusUpdateMsg) {
            // 在末尾添加 |<thinking>[\s\S]*?<\/thinking>
            invisibleRegex = new RegExp([
                /\[.*?(?:接收|退回).*?的转账\]/.source,
                /\[.*?已接收礼物\]/.source,
                /\[system:.*?\]/.source,
                /\[.*?邀请.*?加入了群聊\]/.source,
                /\[.*?修改群名为：.*?\]/.source,
                /\[.*?同意了.*?的代付请求\]/.source,
                /\[.*?拒绝了.*?的代付请求\]/.source,
                /<thinking>[\s\S]*?<\/thinking>/.source,
                /^<thinking>[\s\S]*/.source,
                momentsRegex.source
            ].join('|'));
        } else {
            // 在末尾添加 |<thinking>[\s\S]*?<\/thinking>
            invisibleRegex = new RegExp([
                /\[.*?(?:接收|退回).*?的转账\]/.source,
                /\[.*?更新状态为：.*?\]/.source,
                /\[.*?已接收礼物\]/.source,
                /\[system:.*?\]/.source,
                /\[.*?邀请.*?加入了群聊\]/.source,
                /\[.*?修改群名为：.*?\]/.source,
                /\[system-display:.*?\]/.source,
                /\[.*?同意了.*?的代付请求\]/.source,
                /\[.*?拒绝了.*?的代付请求\]/.source,
                /<thinking>[\s\S]*?<\/thinking>/.source,
                /^<thinking>[\s\S]*/.source,
                momentsRegex.source
            ].join('|'));
        }

        const isSystemMsg = /\[system:.*?\]|\[system-display:.*?\]/.test(msg.content);
        
        if (!isSystemMsg) {
            let prevMsg = null;
            let currentIndexInHistory = start + index;
            
            for (let i = currentIndexInHistory - 1; i >= 0; i--) {
                const candidate = chat.history[i];
                if (!invisibleRegex.test(candidate.content)) {
                    prevMsg = candidate;
                    break;
                }
            }

            if (prevMsg) {
                const currentSender = msg.role === 'user' ? 'user' : (msg.senderId || 'assistant');
                const prevSender = prevMsg.role === 'user' ? 'user' : (prevMsg.senderId || 'assistant');
                
                const timeGap = msg.timestamp - prevMsg.timestamp;
                const isTimeClose = timeGap < 10 * 60 * 1000;

                if (currentSender === prevSender && isTimeClose) {
                    isContinuous = true;
                }
            }
        }

        const bubble = createMessageBubbleElement(msg, isContinuous);
        if (bubble) {
        if (timeDiff > 10 * 60 * 1000 || !isSameDay || lastMsgTime === 0) {
            const timeDivider = document.createElement('div');
            timeDivider.className = 'message-wrapper system-notification time-divider'; 
            
            const timeText = formatTimeDivider(currentMsgTime);
            
            timeDivider.innerHTML = `<div class="system-notification-bubble" style="background-color: transparent; color: #999; font-size: 12px; padding: 2px 8px;">${timeText}</div>`;
            UwUChatTime115.bind(timeDivider.firstElementChild, uwuChatMessageTime111(currentMsgTime), chat);
            fragment.appendChild(timeDivider);
        }
        lastMsgTime = currentMsgTime;

            if (isLoadMore && msg.isThinking && db.inlineThinkingEnabled) {
                messageArea.querySelectorAll('.thinking-toggle-wrapper').forEach(existing => {
                    if (existing.dataset.id === String(msg.id)) existing.remove();
                });
            }
            fragment.appendChild(bubble);
        }
    });
    const existingLoadBtn = document.getElementById('load-more-btn');
    if (existingLoadBtn) existingLoadBtn.remove();
    messageArea.querySelector('#load-newer-btn110')?.remove();
    if (range110 && options.historyDirection === 'newer') messageArea.append(fragment);
    else messageArea.prepend(fragment);
    
    if (range110 ? range110.start > 0 : totalMessages > currentPage * pageSize) {
        const loadMoreButton = document.createElement('button');
        loadMoreButton.id = 'load-more-btn';
        loadMoreButton.className = 'load-more-btn';
        loadMoreButton.textContent = '加载更早的消息';
        messageArea.prepend(loadMoreButton);
    }
    uwuRefreshPostTimes114(messageArea);
    if (forceScrollToBottom && !range110) {
        setTimeout(() => {
            window.ChatViewWork ? window.ChatViewWork.scroll(messageArea) : (messageArea.scrollTop = messageArea.scrollHeight);
        }, 0);
    } else if (isLoadMore) {
        // 临时禁用平滑滚动以防止位置跳动
        messageArea.style.scrollBehavior = 'auto';
        messageArea.scrollTop = messageArea.scrollHeight - oldScrollHeight;
        // 恢复平滑滚动 (使用 setTimeout 确保渲染周期完成)
        setTimeout(() => {
            messageArea.style.scrollBehavior = '';
        }, 0);
    }
    if (range110 && range110.end < totalMessages) {
      const newer = document.createElement('button'); newer.id = 'load-newer-btn110'; newer.className = 'load-more-btn'; newer.type = 'button'; newer.textContent = '加载后面的消息';
      newer.onclick = e => { e.stopPropagation(); renderMessages(true, false, { historyDirection: 'newer' }); };
      messageArea.append(newer);
    }
    if (range110 && isLoadMore) {
      if (anchor110?.isConnected) messageArea.scrollTop += anchor110.getBoundingClientRect().top - anchorTop110;
      else if (options.historyDirection === 'newer') messageArea.scrollTop = oldTop110;
    }
    if (range110 && !isLoadMore && !options.historyFocus) messageArea.scrollTop = oldTop110;
    window.UwURangeSelect111?.refresh();
    window.ReplyDetails?.sync(chat);
    uwuRefreshChatHeader111(chat);
}

function loadMoreMessages() {
    if (window.UwUHistoryJump110?.chatId === currentChatId && window.UwUHistoryJump110?.type === currentChatType) {
      renderMessages(true, false, { historyDirection: 'older' }); return;
    }
    currentPage++;
    renderMessages(true, false);
}

function createMessageBubbleElement(message, isContinuous = false) {
    const voiceOwner98=message;
    if(message.uwuMusicResult||message.uwuReviewCommand||message.uwuToolCommand)return null;
    if(message.uwuTodoOverdue109&&window.UwUTodoCalendar109&&currentChatType==='private'){const c=db.characters.find(c=>c.id===currentChatId);if(c)return uwuBindBareTime115(window.UwUTodoCalendar109.noticeElement(c,message),message,c);}
    if(message.uwuReviewNotice&&window.UwUReviews&&currentChatType==='private'){const c=db.characters.find(c=>c.id===currentChatId);if(c)return uwuBindBareTime115(window.UwUReviews.noticeElement(c,message),message,c);}
    const chat = (currentChatType === 'private') ? db.characters.find(c => c.id === currentChatId) : db.groups.find(g => g.id === currentChatId);
    if(!message.uwuShop96&&chat&&currentChatType==='private'&&Number(message.timestamp)>=(chat.uwuAssets96?.createdAt||Infinity))window.UwUShop96?.adopt(chat,message);
    // 这里需要把 isThinking 从 message 里解构出来
    let {role, content, timestamp, id, transferStatus, giftStatus, stickerData, senderId, quote, isWithdrawn, originalContent, isStatusUpdate, isThinking} = message;
    
    if(message.uwuAssetShare96||message.uwuShop96)return uwuBindBareTime115(window.UwUAssets96?.messageRow(message,chat),message,chat);
    if (role === 'assistant' && typeof content === 'string') {
        content = window.SmartMessaging.stripNote(content).clean;
        if (!content) return null;
        message = { ...message, content };
    }

    // 【新增补丁】如果内容以 <thinking> 开头，强制标记为 isThinking
    // 防止因为数据库加载导致 isThinking 属性丢失，或者正则没匹配到的情况
    if (content && typeof content === 'string') {
        // 兜底机制：将误写的 [char发来的照片：xxx] 或 [char发来的视频：xxx] 修正为 [char发来的照片/视频：xxx]
        content = content.replace(/\[(.+?)发来的(照片|视频)[：:]([\s\S]+?)\]/g, '[$1发来的照片/视频：$3]');
        
        if (content.trim().startsWith('<thinking>')) {
            isThinking = true;
        }
    }

    if (isThinking && db.inlineThinkingEnabled) return uwuBindBareTime115(window.SmartMessaging.thinkingElement(message), message, chat);
    if (isThinking && db.statusThinkingEnabled && currentChatType==='private') return null;

    // 拦截：如果是状态更新或思考过程，且没开调试模式，直接不渲染
    if ((isStatusUpdate || isThinking) && !isDebugMode) return null;

    // ... 后续代码不变 ...


    const avatarMode = chat.avatarMode || 'full';
    let avatarClass = 'message-avatar';
    
    if (avatarMode === 'hidden') {
        avatarClass += ' avatar-hidden';
    } else if (avatarMode === 'kkt') {
        if (role === 'user') {
            avatarClass += ' avatar-hidden';
        } else if (isContinuous) {
            avatarClass += ' avatar-invisible';
        }
    } else if (avatarMode === 'merge') {
        if (isContinuous) {
            avatarClass += ' avatar-invisible';
        }
    }

    if (isWithdrawn && uwuMetadataRequested111(chat, 'uwu-withdrawn-post114')) {
        const wrapper = document.createElement('div');
        wrapper.dataset.id = id;
        return uwuRenderWithdrawnNotice114(wrapper, message, chat);
    }

    const isBilingualMode = chat.bilingualModeEnabled;
    let bilingualMatch = null;
    // 增加 && !isThinking，防止思考内容被当成双语消息解析
    if (isBilingualMode && role === 'assistant' && !isThinking) {
        // 修改正则以兼容 "的消息：" 和 "回复：" (包括 "并回复")
const contentMatch = content.match(/^\[.*?(?:消息|回复)[：:]([\s\S]+)\]$/);
        if (contentMatch) {
            const mainText = contentMatch[1].trim();
            
            // 优先尝试匹配「」
            const lastCloseBracket = mainText.lastIndexOf('」');
            if (lastCloseBracket > -1) {
                const lastOpenBracket = mainText.lastIndexOf('「', lastCloseBracket);
                if (lastOpenBracket > -1) {
                    const chineseText = mainText.substring(lastOpenBracket + 1, lastCloseBracket).trim();
                    const foreignText = mainText.substring(0, lastOpenBracket).trim();
                    if (foreignText && chineseText) {
                        bilingualMatch = [null, foreignText, chineseText];
                    }
                }
            }

            // 如果没有匹配到「」，则回退匹配 () 或 （）以兼容旧消息
            if (!bilingualMatch) {
                const lastCloseParen = Math.max(mainText.lastIndexOf(')'), mainText.lastIndexOf('）'));
                if (lastCloseParen > -1) {
                    const lastOpenParen = Math.max(
                        mainText.lastIndexOf('(', lastCloseParen),
                        mainText.lastIndexOf('（', lastCloseParen)
                    );
                    if (lastOpenParen > -1) {
                        const chineseText = mainText.substring(lastOpenParen + 1, lastCloseParen).trim();
                        const foreignText = mainText.substring(0, lastOpenParen).trim();
                        if (foreignText && chineseText) {
                            bilingualMatch = [null, foreignText, chineseText];
                        }
                    }
                }
            }
        }
    }

    if (bilingualMatch) {
        const foreignText = bilingualMatch[1].trim();
        const chineseText = bilingualMatch[2].trim();
        const wrapper = document.createElement('div');
        wrapper.dataset.id = id;
        wrapper.className = 'message-wrapper received';
        if (message.isContextDisabled) wrapper.classList.add('context-disabled');
        
        if (currentChatType === 'group') {
            wrapper.classList.add('group-message');
        }

        let avatarUrl = chat.avatar;
        let senderNickname = '';
        if (currentChatType === 'group') {
            const sender = chat.members.find(m => m.id === senderId);
            if (sender) {
                avatarUrl = sender.avatar;
                senderNickname = sender.groupNickname;
            } else {
                avatarUrl = 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg';
            }
        }

        const bubbleRow = document.createElement('div');
        bubbleRow.className = 'message-bubble-row';
        const timeString = `${pad(new Date(timestamp).getHours())}:${pad(new Date(timestamp).getMinutes())}`;
        
        const bubbleElement = document.createElement('div');
        bubbleElement.className = 'message-bubble received bilingual-bubble';
        
        const styleMode = chat.bilingualBubbleStyle || 'under';
        
        if (styleMode === 'inner' || styleMode === 'inner-no-line') {
            if (styleMode === 'inner-no-line') {
                bubbleElement.classList.add('inner-no-line-style');
            } else {
                bubbleElement.classList.add('inner-style');
            }
            
            bubbleElement.innerHTML = `
                <span>${DOMPurify.sanitize(foreignText)}</span>
                <div class="bilingual-divider"></div>
                <span class="translation-inner">${DOMPurify.sanitize(chineseText)}</span>
            `;
        } else {
            bubbleElement.innerHTML = `<span>${DOMPurify.sanitize(foreignText)}</span>`;
        }

        const themeKey = chat.theme || 'white_pink';
        const theme = colorThemes[themeKey] || colorThemes['white_pink'];
        const bubbleTheme = theme.received;
        if (!chat.useCustomBubbleCss) {
            bubbleElement.style.backgroundColor = bubbleTheme.bg;
            bubbleElement.style.color = bubbleTheme.text;
        }
        
        // Time Stamp Logic for Bilingual
        const timeSpan = document.createElement('span');
        timeSpan.className = 'message-time';
        timeSpan.textContent = timeString;

        const timestampStyle = chat.timestampStyle || 'bubble';

        // Append Time Stamp to Bubble (if style is bubble)
        if (timestampStyle === 'bubble') {
            bubbleElement.appendChild(timeSpan);
        }

        const messageInfo = document.createElement('div');
        messageInfo.className = 'message-info';
        const avatarImg = document.createElement('img');
        avatarImg.src = avatarUrl;
        avatarImg.className = avatarClass;
        messageInfo.appendChild(avatarImg);

        if (timestampStyle === 'avatar') {
            messageInfo.appendChild(timeSpan);
        }

        if (currentChatType === 'group') {
            const contentContainer = document.createElement('div');
            contentContainer.className = 'group-msg-content';
            
            if (senderNickname) {
                const nicknameDiv = document.createElement('div');
                nicknameDiv.className = 'group-nickname';
                nicknameDiv.textContent = senderNickname;
                contentContainer.appendChild(nicknameDiv);
            }
            
            contentContainer.appendChild(bubbleElement);
            bubbleRow.appendChild(messageInfo);
            bubbleRow.appendChild(contentContainer);
        } else {
            bubbleRow.appendChild(messageInfo);
            bubbleRow.appendChild(bubbleElement);
        }

        wrapper.appendChild(bubbleRow);

        if (styleMode === 'under') {
            const translationDiv = document.createElement('div');
            translationDiv.className = 'translation-text';
            translationDiv.textContent = chineseText;
            wrapper.appendChild(translationDiv);
        }

        window.UwUBilingual113.prepare(wrapper,message,chat,styleMode==='translation-only'?DOMPurify.sanitize(chineseText):undefined, foreignText);

        // --- 【新增】在双语消息中注入引用(回复)气泡渲染逻辑 ---
        if (quote) {
            let quotedSenderName = '';
            // 解析被引用人的名字
            if (quote.senderId === 'user_me') {
                quotedSenderName = (currentChatType === 'private')
                    ? ((chat.myRemarkName && chat.myRemarkName.trim()) || chat.myName || 'User')
                    : chat.me.nickname;
            } else {
                if (currentChatType === 'private') {
                    quotedSenderName = chat.remarkName;
                } else {
                    const sender = chat.members.find(m => m.id === quote.senderId);
                    quotedSenderName = sender ? sender.groupNickname : '未知成员';
                }
            }
            
            // 创建引用气泡 DOM
            const quoteDiv = document.createElement('div');
            quoteDiv.className = 'quoted-message';
            const sanitizedQuotedText = DOMPurify.sanitize(quote.content, { ALLOWED_TAGS: [] });
            quoteDiv.innerHTML = `<span class="quoted-sender">回复 ${quotedSenderName}</span><p class="quoted-text">${sanitizedQuotedText}</p>`;
            
            // 将引用气泡插入到双语主气泡的前面 (CSS绝对定位会自动处理位置)
            bubbleElement.prepend(quoteDiv);
        }
        // ---------------------------------------------------
        
        return uwuQuoteMetadata111(wrapper, message, chat);
    }

    const timeSkipRegex = /\[system-display:([\s\S]+?)\]/;
    const inviteRegex = /\[(.*?)邀请(.*?)加入了群聊\]/;
    const renameRegex = /\[(.*?)修改群名为[：:](.*?)\]/;
    const updateStatusRegex = /\[(.*?)更新状态为[：:](.*?)\]/;
    const callInviteRegex = /\[(.*?)向(.*?)发起了(视频|语音)通话\]/;
    const callRejectRegex = /\[(.*?)拒绝了(.*?)的(视频|语音)通话\]/;

    const timeSkipMatch = content.match(timeSkipRegex);
    const inviteMatch = content.match(inviteRegex);
    const renameMatch = content.match(renameRegex);
    const updateStatusMatch = content.match(updateStatusRegex);
    const callInviteMatch = content.match(callInviteRegex);
    const callRejectMatch = content.match(callRejectRegex);

    // 私聊消息正则
    const privateRegex = /^\[Private: (.*?) -> (.*?): ([\s\S]+?)\]$/;
    const privateEndRegex = /^\[Private-End: (.*?) -> (.*?)\]$/;

    let invisibleRegex;
    const momentsRegex = /\[(?:.*?)\s*(?:发布了一条(?:带图)?动态|评论了.*?|回复.*?|更新了个性签名)[：:][\s\S]+?\]/;
    if (chat.showStatusUpdateMsg) {
        // 在末尾添加 |<thinking>[\s\S]*?<\/thinking>
        invisibleRegex = new RegExp([
            /\[.*?(?:接收|退回).*?的转账\]/.source,
            /\[.*?已接收礼物\]/.source,
            /\[system:.*?\]/.source,
            /\[系统情景通知：.*?\]/.source,
            /\[.*?同意了.*?的代付请求\]/.source,
            /\[.*?拒绝了.*?的代付请求\]/.source,
            /<thinking>[\s\S]*?<\/thinking>/.source,
            /^<thinking>[\s\S]*/.source,
            momentsRegex.source
        ].join('|'));
    } else {
        // 在末尾添加 |<thinking>[\s\S]*?<\/thinking>
        invisibleRegex = new RegExp([
            /\[.*?(?:接收|退回).*?的转账\]/.source,
            /\[.*?更新状态为：.*?\]/.source,
            /\[.*?已接收礼物\]/.source,
            /\[system:.*?\]/.source,
            /\[系统情景通知：.*?\]/.source,
            /\[.*?同意了.*?的代付请求\]/.source,
            /\[.*?拒绝了.*?的代付请求\]/.source,
            /<thinking>[\s\S]*?<\/thinking>/.source,
            /^<thinking>[\s\S]*/.source,
            momentsRegex.source
        ].join('|'));
    }

    let isDebugHiddenMsg = false;
    // 在这里增加 || isThinking，只要标记为思考中，就强制走隐形消息逻辑
    if (invisibleRegex.test(content) || privateRegex.test(content) || privateEndRegex.test(content) || isThinking) {
        if (!isDebugMode) return null; 
        isDebugHiddenMsg = true;       
    }

    const wrapper = document.createElement('div');
    wrapper.dataset.id = id;
    if (isDebugHiddenMsg) {
        wrapper.className = 'message-wrapper received';
        if (message.isContextDisabled) wrapper.classList.add('context-disabled'); 
        const bubbleRow = document.createElement('div');
        bubbleRow.className = 'message-bubble-row';
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble debug-visible'; 
        bubble.textContent = content; 
        bubbleRow.appendChild(bubble);
        wrapper.appendChild(bubbleRow);
        return uwuQuoteMetadata111(wrapper, message, chat);
    }

    if (isWithdrawn) return uwuRenderWithdrawnNotice114(wrapper, message, chat);
    // 【新增】 && !isThinking —— 只有当不是思考过程时，才允许渲染成系统通知气泡
    if ((timeSkipMatch || inviteMatch || renameMatch || (updateStatusMatch && chat.showStatusUpdateMsg) || callInviteMatch || callRejectMatch) && !isThinking) {
        wrapper.className = 'message-wrapper system-notification';
        if (message.isContextDisabled) wrapper.classList.add('context-disabled');
        let bubbleText = '';
        if (timeSkipMatch) bubbleText = timeSkipMatch[1];
        if (inviteMatch) bubbleText = `${inviteMatch[1]}邀请${inviteMatch[2]}加入了群聊`;
        if (renameMatch) bubbleText = `${renameMatch[1]}修改群名为“${renameMatch[2]}”`;
        if (updateStatusMatch) bubbleText = `${updateStatusMatch[1]} 更新状态为：${updateStatusMatch[2]}`;
        if (callInviteMatch) bubbleText = `${callInviteMatch[1]}向${callInviteMatch[2]}发起了${callInviteMatch[3]}通话`;
        if (callRejectMatch) bubbleText = `${callRejectMatch[1]}拒绝了${callRejectMatch[2]}的${callRejectMatch[3]}通话`;
        wrapper.innerHTML = `<div class="system-notification-bubble">${bubbleText}</div>`;
        return uwuQuoteMetadata111(wrapper, message, chat);
    }

    const isSent = (role === 'user');
    let avatarUrl, bubbleTheme, senderNickname = '';
    const themeKey = chat.theme || 'white_pink';
    const theme = colorThemes[themeKey] || colorThemes['white_pink'];
    let messageSenderId = isSent ? 'user_me' : senderId;
    if (isSent) {
        avatarUrl = (currentChatType === 'private') ? chat.myAvatar : chat.me.avatar;
        bubbleTheme = theme.sent;
    } else {
        if (currentChatType === 'private') {
            avatarUrl = chat.avatar;
        } else {
            const sender = chat.members.find(m => m.id === senderId);
            if (sender) {
                avatarUrl = sender.avatar;
                senderNickname = sender.groupNickname;
            } else {
                avatarUrl = 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg';
            }
        }
        bubbleTheme = theme.received;
    }
    const timeString = `${pad(new Date(timestamp).getHours())}:${pad(new Date(timestamp).getMinutes())}`;
    wrapper.className = `message-wrapper ${isSent ? 'sent' : 'received'}`;
    if (message.isContextDisabled) wrapper.classList.add('context-disabled');
    if (currentChatType === 'group' && !isSent) {
        wrapper.classList.add('group-message');
    }
    if (avatarClass.includes('avatar-hidden')) {
        wrapper.classList.add('no-avatar-layout');
    }
    if (avatarClass.includes('avatar-invisible')) {
        wrapper.classList.add('avatar-invisible-layout');
    }
    const bubbleRow = document.createElement('div');
    bubbleRow.className = 'message-bubble-row';
    let bubbleElement;
    const urlRegex = /^(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|bmp|svg)|data:image\/[a-z]+;base64,)/i;
    
    const sentStickerRegex = /\[(?:.+?)发送的表情包[：:](.+?)\]/i;
    const receivedStickerRegex = /\[(?:.*?的)?表情包[：:](.+?)\]/i;
    
    const voiceRegex = /\[(?:.+?)的语音[：:]([\s\S]+?)\]/;
    const photoVideoRegex = /\[(?:.+?)发来的照片\/视频[：:]([\s\S]+?)\]/;
    const privateSentTransferRegex = /\[.*?给你转账[：:]([\d.,]+)元[；;]备注[：:](.*?)\]/;
    const privateReceivedTransferRegex = /\[.*?的转账[：:]([\d.,]+)元[；;]备注[：:](.*?)\]/;
    const groupTransferRegex = /\[(.*?)\s*向\s*(.*?)\s*转账[：:]([\d.,]+)元[；;]备注[：:](.*?)\]/;
    const privateGiftRegex = /\[(?:.+?)送来的礼物[：:]([\s\S]+?)\]/;
    const groupGiftRegex = /\[(.*?)\s*向\s*(.*?)\s*送来了礼物[：:]([\s\S]+?)\]/;
    const imageRecogRegex = /\[.*?发来了一张图片[：:]\]/;
    const textRegex = /^\[(?:.+?)的消息[：:]([\s\S]+)\]$/;
    const redPacketRegex = /\[(.*?)发出了一个拼手气红包[：:](.*?)元[；;]留言[：:](.*?)\]/;
    
    // 新版购物车小票格式: [A为B下单了：配送方式|总价|商品名 x数量]
    const shopOrderRegexNew = /\[(.*?)为(.*?)下单了[：:](.*?)\|(.*?)\|([\s\S]*?)\]/;
    // 代付请求格式: [A向B发起了代付请求:总价|商品名 x数量]
    const shopPayRequestRegex = /\[(.*?)向(.*?)发起了代付请求[：:](.*?)\|([\s\S]*?)\]/;
    
    // 通话记录格式: [视频通话记录：时间；时长；总结] 或 [语音通话记录：...]
    const callRecordRegex = /\[(视频|语音)通话记录[：:](.*?)[；;](.*?)[；;](.*?)\]/;
    
    // 转发聊天记录正则
    const forwardedChatRegex = new RegExp(`<${chat.realName}转发的聊天记录>([\\s\\S]+?)<\\/${chat.realName}转发的聊天记录>`);
    
    const shopOrderMatchNew = content.match(shopOrderRegexNew);
    const shopPayRequestMatch = content.match(shopPayRequestRegex);
    const callRecordMatch = content.match(callRecordRegex);
    const forwardedChatMatch = content.match(forwardedChatRegex);
    
    const sentStickerMatch = content.match(sentStickerRegex);
    const receivedStickerMatch = content.match(receivedStickerRegex);
    const voiceMatch = content.match(voiceRegex);
    const clearedMediaSummary97 = message.media97?.cleared ? window.UwUMedia97?.summary97(message) : '';
    const photoVideoMatch = clearedMediaSummary97 ? [null, clearedMediaSummary97] : content.match(photoVideoRegex);
    const privateSentTransferMatch = content.match(privateSentTransferRegex);
    const privateReceivedTransferMatch = content.match(privateReceivedTransferRegex);
    const groupTransferMatch = content.match(groupTransferRegex);
    const privateGiftMatch = content.match(privateGiftRegex);
    const groupGiftMatch = content.match(groupGiftRegex);
    const imageRecogMatch = content.match(imageRecogRegex);
    const textMatch = content.match(textRegex);
    const redPacketMatch = content.match(redPacketRegex);
    
    if(message.uwuDiary110&&window.UwUExchange110){bubbleElement=UwUExchange110.shareCard(chat,message);
    } else if(message.uwuNote97&&window.UwUNotes97){bubbleElement=UwUNotes97.card(chat,message);
    } else if(message.uwuKeepsake97&&window.UwUKeepsakes97){bubbleElement=UwUKeepsakes97.card(chat,message);
    } else if(!clearedMediaSummary97 && window.UwUMedia97?.isMedia(message)){bubbleElement=UwUMedia97.card(chat,message);
    } else if(message.uwuToolCard&&window.UwUChatToolsUI){bubbleElement=UwUChatToolsUI.card(chat,message);
    } else if(message.uwuReviewShare&&window.UwUReviewShare){bubbleElement=UwUReviewShare.card(chat,message);
    } else if(message.uwuBookQuote&&window.UwUMedia88){bubbleElement=window.UwUMedia88.card(chat,message);
    } else if(message.uwuSongShare&&window.UwUMusicShare){bubbleElement=window.UwUMusicShare.card(chat,message);
    } else if (message.uwuMusicInvite && window.UwUMusicHost) {
        // Use the same avatar, continuous-message and timestamp layout as other cards.
        bubbleElement = window.UwUMusicHost.card(message, chat);
    } else if (redPacketMatch || message.type === 'red-packet') {
        const senderName = redPacketMatch ? redPacketMatch[1] : (isSent ? '你' : '用户');
        const remark = message.remark || (redPacketMatch ? redPacketMatch[3] : '恭喜发财，大吉大利');
        
        bubbleElement = document.createElement('div');
        bubbleElement.className = 'red-packet-card';
        bubbleElement.innerHTML = `
            <div class="red-packet-top">
                <div class="red-packet-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-piggy-bank" viewBox="0 0 16 16">
                      <path d="M5 6.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm1.138-1.496A6.613 6.613 0 0 1 7.964 4.5c.666 0 1.303.097 1.893.273a.5.5 0 0 0 .286-.958A7.602 7.602 0 0 0 7.964 3.5c-.734 0-1.441.103-2.102.292a.5.5 0 1 0 .276.962z"/>
                      <path fill-rule="evenodd" d="M7.964 1.527c-2.977 0-5.571 1.704-6.32 4.125h-.55A1 1 0 0 0 .11 6.824l.254 1.46a1.5 1.5 0 0 0 1.478 1.243h.263c.3.513.688.978 1.145 1.382l-.729 2.477a.5.5 0 0 0 .48.641h2a.5.5 0 0 0 .471-.332l.482-1.351c.635.173 1.31.267 2.011.267.707 0 1.388-.095 2.028-.272l.543 1.372a.5.5 0 0 0 .465.316h2a.5.5 0 0 0 .478-.645l-.761-2.506C13.81 9.895 14.5 8.559 14.5 7.069c0-.145-.007-.29-.02-.431.261-.11.508-.266.705-.444.315.306.815.306.815-.417 0 .223-.5.223-.461-.026a.95.95 0 0 0 .09-.255.7.7 0 0 0-.202-.645.58.58 0 0 0-.707-.098.735.735 0 0 0-.375.562c-.024.243.082.48.32.654a2.112 2.112 0 0 1-.259.153c-.534-2.664-3.284-4.595-6.442-4.595zM2.516 6.26c.455-2.066 2.667-3.733 5.448-3.733 3.146 0 5.536 2.114 5.536 4.542 0 1.254-.624 2.41-1.67 3.248a.5.5 0 0 0-.165.535l.66 2.175h-.985l-.59-1.487a.5.5 0 0 0-.629-.288c-.661.23-1.39.359-2.157.359a6.558 6.558 0 0 1-2.157-.359.5.5 0 0 0-.635.304l-.525 1.471h-.979l.633-2.15a.5.5 0 0 0-.17-.534 4.649 4.649 0 0 1-1.284-1.541.5.5 0 0 0-.446-.275h-.56a.5.5 0 0 1-.492-.414l-.254-1.46h.933a.5.5 0 0 0 .488-.393zm12.621-.857a.565.565 0 0 1-.098.21.704.704 0 0 1-.044-.025c-.146-.09-.157-.175-.152-.223a.236.236 0 0 1 .117-.173c.049-.027.08-.021.113.012a.202.202 0 0 1 .064.199z"/>
                    </svg>
                </div>
                <div class="red-packet-info">
                    <div class="red-packet-remark">${DOMPurify.sanitize(remark)}</div>
                    <div class="red-packet-type">拼手气红包</div>
                </div>
            </div>
        `;

        // 绑定点击事件
        bubbleElement.style.cursor = 'pointer';
        bubbleElement.addEventListener('click', async () => {
            if (!message.isRevealed) {
                if (message.distributions && message.distributions['user_me']) {
                    // 已经抢过，直接显示详情
                    if (typeof showRedPacketDetails === 'function') {
                        showRedPacketDetails(message, chat);
                    }
                    return;
                }
                if (message.pool && message.pool.length > 0) {
                    // 随机抽取一个金额
                    const randomIndex = Math.floor(Math.random() * message.pool.length);
                    const grabbedAmount = message.pool.splice(randomIndex, 1)[0];
                    if (!message.distributions) message.distributions = {};
                    message.distributions['user_me'] = grabbedAmount;
                    
                    // 如果池子空了，标记为已揭晓
                    if (message.pool.length === 0) {
                        message.isRevealed = true;
                    }
                    
                    await saveData();
                    
                    // 领取成功后显示详情
                    if (typeof showRedPacketDetails === 'function') {
                        showRedPacketDetails(message, chat);
                    }
                } else {
                    showToast('手慢了，红包派完了');
                    message.isRevealed = true;
                    await saveData();
                    if (typeof showRedPacketDetails === 'function') {
                        showRedPacketDetails(message, chat);
                    }
                }
            } else {
                // 已揭晓，直接显示详情
                if (typeof showRedPacketDetails === 'function') {
                    showRedPacketDetails(message, chat);
                }
            }
        });
    } else if (forwardedChatMatch) {
        const chatContent = forwardedChatMatch[1].trim();
        // 截取前两行作为预览
        const lines = chatContent.split('\n').filter(line => line.trim() !== '');
        const previewLines = lines.slice(0, 3).map(line => {
            // 简单截断过长的行
            return line.length > 20 ? line.substring(0, 20) + '...' : line;
        }).join('<br>');
        
        bubbleElement = document.createElement('div');
        bubbleElement.className = 'forwarded-chat-card';
        bubbleElement.innerHTML = `
            <div class="forwarded-chat-title">${chat.realName}的聊天记录</div>
            <div class="forwarded-chat-preview">${DOMPurify.sanitize(previewLines)}</div>
            <div class="forwarded-chat-footer">聊天记录</div>
        `;
        
        // 绑定点击事件，显示完整聊天记录
        bubbleElement.addEventListener('click', () => {
            if (typeof showForwardedChatModal === 'function') {
                showForwardedChatModal(chatContent, chat.realName);
            }
        });
    } else if (callRecordMatch) {
        // 匹配结果: [0]全文, [1]类型(视频/语音), [2]时间, [3]时长, [4]总结
        const type = callRecordMatch[1]; 
        const durationStr = callRecordMatch[3];
        
        // 复用系统通知样式，覆盖默认的 sent/received 类
        wrapper.className = 'message-wrapper system-notification';
        if (message.isContextDisabled) wrapper.classList.add('context-disabled');
        
        const title = type === '视频' ? '视频通话结束' : '语音通话结束';

        // 直接设置 wrapper 内容，模仿系统通知
        wrapper.innerHTML = `
            <div class="system-notification-bubble" style="cursor: pointer;" title="点击查看详情">
                ${title} ${durationStr} <span style="font-size: 10px; opacity: 0.6;">›</span>
            </div>
        `;
        
        // 绑定点击事件打开详情
        const bubble = wrapper.querySelector('.system-notification-bubble');
        if (message.callRecordId && bubble) {
            bubble.addEventListener('click', () => {
                if (window.VideoCallModule && typeof window.VideoCallModule.showDetailModal === 'function') {
                    window.VideoCallModule.showDetailModal(message.callRecordId);
                }
            });
        }
        
        return uwuQuoteMetadata111(wrapper, message, chat); // 直接返回，跳过后续的气泡组装逻辑

    } else if (shopOrderMatchNew) {
        // 新版小票渲染 (普通订单)
        // [A为B下单了：配送方式|总价|商品名 x数量]
        const deliveryType = shopOrderMatchNew[3];
        const totalPrice = shopOrderMatchNew[4];
        const itemsStr = shopOrderMatchNew[5];
        
        // 解析商品列表字符串 "汉堡 x2, 可乐 x1" -> [{name, qty}]
        const items = itemsStr.split(/[,，、;；\n]+\s*/).map(s => {
            const parts = s.trim().match(/(.+?)\s*[xX×ｘ]\s*(\d+)$/);
            if (parts) {
                return { name: parts[1], qty: parts[2] };
            }
            return { name: s, qty: 1 };
        });

        const now = new Date(timestamp);
        const orderId = `NO.${now.getTime().toString().slice(-8)}`;
        const dateStr = `${now.getMonth()+1}/${now.getDate()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

        bubbleElement = document.createElement('div');
        bubbleElement.className = 'receipt-bubble';
        
        // 检查是否为自提订单
        const pickupMatch = deliveryType.match(/自提口令:\s*(.*)/);
        let isPickup = !!pickupMatch;
        let pickupCode = pickupMatch ? pickupMatch[1] : '';
        let isPickedUp = message.isPickedUp || false;

        let itemsHtml = '';
        let stampHtml = '';

        if (isPickup && !isPickedUp) {
            // 未自提：隐藏商品
            itemsHtml = `
                <div class="receipt-item-row">
                    <span class="receipt-item-name">🎁 神秘商品</span>
                    <span class="receipt-dots"></span>
                    <span class="receipt-item-qty">x?</span>
                </div>
            `;
        } else {
            // 已自提或普通订单：显示商品
            itemsHtml = items.map(item => `
                <div class="receipt-item-row">
                    <span class="receipt-item-name">${DOMPurify.sanitize(item.name)}</span>
                    <span class="receipt-dots"></span>
                    <span class="receipt-item-qty">x${item.qty}</span>
                </div>
            `).join('');
        }

        if (isPickup && isPickedUp) {
            // 使用 SVG 图标替代印章
            stampHtml = `
            <svg class="receipt-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M8 12l3 3 5-5"></path>
            </svg>`;
        }

        let pickupCodeHtml = '';
        if (isPickup && !isPickedUp) {
            pickupCodeHtml = `<div class="receipt-pickup-code">🔑 ${pickupCode}</div>`;
        }

        bubbleElement.innerHTML = `
            ${stampHtml}
            <div class="receipt-header">
                <div class="receipt-brand">UwU MART</div>
                <div class="receipt-id">${orderId}</div>
            </div>
            <div class="receipt-items">
                ${itemsHtml}
            </div>
            <div class="receipt-total-section">
                <span class="receipt-total-price">¥${totalPrice}</span>
            </div>
            <div class="receipt-footer">
                ${pickupCodeHtml}
                <div class="receipt-delivery-info">
                    <span>${isPickup ? '门店自提' : deliveryType}</span>
                    <span>${dateStr}</span>
                </div>
            </div>
        `;

    } else if (shopPayRequestMatch) {
        // 代付请求小票渲染
        // [A向B发起了代付请求:总价|商品名 x数量]
        let stampHtml = '';
        const totalPrice = shopPayRequestMatch[3];
        const itemsStr = shopPayRequestMatch[4];
        
        const items = itemsStr.split(/[,，、;；\n]+\s*/).map(s => {
            const parts = s.trim().match(/(.+?)\s*[xX×ｘ]\s*(\d+)$/);
            if (parts) {
                return { name: parts[1], qty: parts[2] };
            }
            return { name: s, qty: 1 };
        });

        const now = new Date(timestamp);
        const orderId = `REQ.${now.getTime().toString().slice(-8)}`;
        const dateStr = `${now.getMonth()+1}/${now.getDate()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

        bubbleElement = document.createElement('div');
        bubbleElement.className = 'receipt-bubble pay-request';
        
        let itemsHtml = items.map(item => `
            <div class="receipt-item-row">
                <span class="receipt-item-name">${DOMPurify.sanitize(item.name)}</span>
                <span class="receipt-dots"></span>
                <span class="receipt-item-qty">x${item.qty}</span>
            </div>
        `).join('');

        // 移除印章逻辑，改为修改底部文字
        let statusText = '待支付';
        if (message.payStatus === 'paid') {
            statusText = '已支付';
        } else if (message.payStatus === 'expired') {
            statusText = '已失效';
        } else if (message.payStatus === 'rejected') {
            statusText = '已拒绝';
        }

        let actionButtonsHtml = '';
        // 如果是接收到的消息 (AI -> User) 且状态为 pending，显示操作按钮
        if (!isSent && !message.payStatus) {
            actionButtonsHtml = `
                <div class="receipt-actions">
                    <button class="receipt-action-btn" onclick="sendPayResponse('${id}', 'pay')">支付</button>
                    <button class="receipt-action-btn" onclick="sendPayResponse('${id}', 'reject')">拒绝</button>
                </div>
            `;
        }

        bubbleElement.innerHTML = `
            ${stampHtml}
            <div class="receipt-header">
                <div class="receipt-brand">PAY FOR ME</div>
                <div class="receipt-id">${orderId}</div>
            </div>
            <div class="receipt-items">
                ${itemsHtml}
            </div>
            <div class="receipt-total-section">
                <span class="receipt-total-price">¥${totalPrice}</span>
            </div>
            <div class="receipt-footer">
                <div class="receipt-delivery-info">
                    <span class="pay-status-text">${statusText}</span>
                    <span>${dateStr}</span>
                </div>
                ${actionButtonsHtml}
            </div>
        `;

    } else if ((isSent && sentStickerMatch) || (!isSent && receivedStickerMatch)) {
        bubbleElement = document.createElement('div');
        bubbleElement.className = 'image-bubble';
        let stickerSrc = '';
        
        if (isSent && stickerData) {
            stickerSrc = stickerData;
        } else {
            const stickerName = isSent ? sentStickerMatch[1].trim() : receivedStickerMatch[1].trim();
            
            const groups = (chat.stickerGroups || '').split(/[,，]/).map(s => s.trim()).filter(Boolean);
            
            let targetSticker = null;
            if (groups.length > 0) {
                targetSticker = db.myStickers.find(s => groups.includes(s.group) && s.name === stickerName);
            }
            
            if (!targetSticker) {
                targetSticker = db.myStickers.find(s => s.name === stickerName);
            }
            
            if (targetSticker) {
                stickerSrc = targetSticker.data;
            } else {
                stickerSrc = 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg'; 
            }
        }
        bubbleElement.innerHTML = `<img src="${stickerSrc}" alt="表情包">`;
    } else if (privateGiftMatch || groupGiftMatch) {
        const match = privateGiftMatch || groupGiftMatch;
        bubbleElement = document.createElement('div');
        bubbleElement.className = 'gift-card';
        if (giftStatus === 'received') {
            bubbleElement.classList.add('received');
        }
        let giftText;
        if (groupGiftMatch) {
            const from = groupGiftMatch[1];
            const to = groupGiftMatch[2];
            giftText = isSent ? `你送给 ${to} 的礼物` : `${from} 送给 ${to} 的礼物`;
        } else {
            giftText = isSent ? '您有一份礼物～' : '您有一份礼物～';
        }
        bubbleElement.innerHTML = `<img src="https://i.postimg.cc/rp0Yg31K/chan-75.png" alt="gift" class="gift-card-icon"><div class="gift-card-text">${giftText}</div><div class="gift-card-received-stamp">已查收</div>`;
        const description = groupGiftMatch ? groupGiftMatch[3].trim() : match[1].trim();
        const descriptionDiv = document.createElement('div');
        descriptionDiv.className = 'gift-card-description';
        descriptionDiv.textContent = description;
        wrapper.appendChild(descriptionDiv);
    } else if (voiceMatch) {
        bubbleElement = document.createElement('div');
        bubbleElement.className = 'voice-bubble';
        if (!chat.useCustomBubbleCss) {
            bubbleElement.style.backgroundColor = bubbleTheme.bg;
            bubbleElement.style.color = bubbleTheme.text;
        }
        bubbleElement.innerHTML = `<svg class="play-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg><span class="duration">${calculateVoiceDuration(voiceMatch[1].trim())}"</span>`;
        if(isSent&&voiceOwner98.userAudio99)window.UwUAudioInput99?.bind(bubbleElement,voiceOwner98,chat);
        const transcriptDiv = document.createElement('div');
        transcriptDiv.className = 'voice-transcript';
        if (voiceOwner98.userAudio99?.removed || voiceOwner98.audio98?.status === 'cleared') transcriptDiv.classList.add('active');
        transcriptDiv.textContent = window.UwUVoiceExpression111?.stripDelivery111(voiceMatch[1]).trim() ?? voiceMatch[1].trim();
        if (!isSent && currentChatType==='private' && window.UwUVoice98) {
            UwUVoice98.bindBubble(bubbleElement, voiceOwner98, chat, voiceMatch[1].trim());
        }
        wrapper.appendChild(transcriptDiv);
        if(isSent&&voiceOwner98.userAudio99)window.UwUAudioInput99?.decorateTranscript(wrapper,voiceOwner98);
    } else if (photoVideoMatch) {
        const pvContent = photoVideoMatch[1].trim();
        let isRealPhoto = false;
        let realPhotoUrl = '';

        // 检查真实相册匹配
        if (!clearedMediaSummary97 && currentChatType === 'private' && !isSent && chat.useRealGallery && chat.gallery) {
            const galleryItem = chat.gallery.find(item => item.name === pvContent);
            if (galleryItem) {
                isRealPhoto = true;
                realPhotoUrl = galleryItem.url;
            }
        }

        if (isRealPhoto) {
            bubbleElement = document.createElement('div');
            bubbleElement.className = 'image-bubble';
            bubbleElement.innerHTML = `<img src="${realPhotoUrl}" alt="${pvContent}" onclick="openImageViewer(this.src)" style="cursor: zoom-in;">`;
        } else {
            bubbleElement = document.createElement('div');
            bubbleElement.className = 'pv-card';
            bubbleElement.innerHTML = `<div class="pv-card-content"></div><div class="pv-card-image-overlay" style="background-image: url('${isSent ? 'https://i.postimg.cc/L8NFrBrW/1752307494497.jpg' : 'https://i.postimg.cc/1tH6ds9g/1752301200490.jpg'}');"></div><div class="pv-card-footer"><svg viewBox="0 0 24 24"><path d="M4,4H20A2,2 0 0,1 22,6V18A2,2 0 0,1 20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4M4,6V18H20V6H4M10,9A1,1 0 0,1 11,10A1,1 0 0,1 10,11A1,1 0 0,1 9,10A1,1 0 0,1 10,9M8,17L11,13L13,15L17,10L20,14V17H8Z"></path></svg><span>照片/视频・长按接收</span></div>`;
        }
        if (!isRealPhoto) {
            bubbleElement.querySelector('.pv-card-content').textContent = pvContent;
            if (isDebugMode) {
                bubbleElement.querySelector('.pv-card-image-overlay').classList.add('hidden');
                bubbleElement.querySelector('.pv-card-footer').classList.add('hidden');
            }
            if (!isSent && !clearedMediaSummary97 && id != null) {
                void bindAirDropCard115(bubbleElement, chat.id, airDropMessageKey115(chat, id)).catch(console.error);
            }
        }
    } else if (privateSentTransferMatch || privateReceivedTransferMatch || groupTransferMatch) {
        const isSentTransfer = !!privateSentTransferMatch || (groupTransferMatch && isSent);
        const match = privateSentTransferMatch || privateReceivedTransferMatch || groupTransferMatch;
        let amount, remarkText, titleText;
        if (groupTransferMatch) {
            const from = groupTransferMatch[1];
            const to = groupTransferMatch[2];
            amount = parseFloat(groupTransferMatch[3].replace(/,/g, '')).toFixed(2);
            remarkText = groupTransferMatch[4] || '';
            
            const myName = (currentChatType === 'private') ? chat.myName : chat.me.nickname;
            const isToMe = (to === myName);

            if (isSent) {
                titleText = `向 ${to} 转账`;
            } else {
                if (isToMe) {
                    titleText = `${from} 向你转账`;
                } else {
                    titleText = `${from} 向 ${to} 转账`;
                }
            }
        } else {
            amount = parseFloat(match[1].replace(/,/g, '')).toFixed(2);
            remarkText = match[2] || '';
            titleText = isSentTransfer ? '给你转账' : '转账';
        }
        bubbleElement = document.createElement('div');
        bubbleElement.className = `transfer-card ${isSentTransfer ? 'sent-transfer' : 'received-transfer'}`;
        
        let statusText = isSentTransfer ? '待查收' : '转账给你';
        if (groupTransferMatch && !isSent) {
            const to = groupTransferMatch[2];
            const myName = (currentChatType === 'private') ? chat.myName : chat.me.nickname;
            if (to === myName) {
                statusText = '转账给你';
            } else {
                statusText = '转账给Ta';
            }
        }
        
        if (transferStatus === 'received') {
            statusText = '已收款';
            bubbleElement.classList.add('received');
        } else if (transferStatus === 'returned') {
            statusText = '已退回';
            bubbleElement.classList.add('returned');
        }
        if ((transferStatus !== 'pending' && currentChatType === 'private') || currentChatType === 'group') {
            bubbleElement.style.cursor = 'default';
        }
        const remarkHTML = remarkText ? `<p class="transfer-remark">${remarkText}</p>` : '';
        bubbleElement.innerHTML = `<div class="overlay"></div><div class="transfer-content"><p class="transfer-title">${titleText}</p><p class="transfer-amount">${window.UwUTransferCurrency95?.currency(chat).symbol||'¥'}${amount}</p>${remarkHTML}<p class="transfer-status">${statusText}</p></div>`;
    } else if (imageRecogMatch || urlRegex.test(content)) {
        bubbleElement = document.createElement('div');
        bubbleElement.className = 'image-bubble';
        bubbleElement.innerHTML = `<img src="${content}" alt="图片消息">`;
    } else if (textMatch) {
        bubbleElement = document.createElement('div');
        bubbleElement.className = `message-bubble ${isSent ? 'sent' : 'received'}`;
        let userText = textMatch[1].trim().replace(/\[发送时间:.*?\]/g, '').trim();
        bubbleElement.innerHTML = `<span class="bubble-content">${DOMPurify.sanitize(userText)}</span>`;
        if (!chat.useCustomBubbleCss) {
            bubbleElement.style.backgroundColor = bubbleTheme.bg;
            bubbleElement.style.color = bubbleTheme.text;
        }
    } else if (message && Array.isArray(message.parts) && message.parts[0].type === 'html') {
        bubbleElement = document.createElement('div');
        bubbleElement.className = `message-bubble ${isSent ? 'sent' : 'received'} html-bubble`;
        const htmlContent = message.parts[0].text;
        if (htmlContent.includes('<!DOCTYPE html>') || htmlContent.includes('<html')) {
            const processedHtml = processTemplate(htmlContent, chat);
            bubbleElement.innerHTML = `<iframe srcdoc="${processedHtml.replace(/"/g, '"')}" style="width: 100%; min-width: 250px; height: 350px; border: none; background: white; border-radius: 10px;"></iframe>`;
        } else {
            const processedHtml = processTemplate(htmlContent, chat);
            bubbleElement.innerHTML = DOMPurify.sanitize(processedHtml, { ADD_TAGS: ['style'], ADD_ATTR: ['style'] });
        }
    } else {
        bubbleElement = document.createElement('div');
        bubbleElement.className = `message-bubble ${isSent ? 'sent' : 'received'}`;
        let displayedContent = content;
        const plainTextMatch = content.match(/^\[.*?[：:]([\s\S]*)\]$/);
        if (plainTextMatch && plainTextMatch[1]) {
            displayedContent = plainTextMatch[1].trim();
        }
        displayedContent = displayedContent.replace(/\[发送时间:.*?\]/g, '').trim();

        if (currentChatType === 'private' && !isSent && chat.statusPanel && chat.statusPanel.enabled && chat.statusPanel.regexPattern && !isDebugMode) {
            try {
                let pattern = chat.statusPanel.regexPattern;
                let flags = 'gs';

                const matchParts = pattern.match(/^\/(.*?)\/([a-z]*)$/);
                if (matchParts) {
                    pattern = matchParts[1];
                    flags = matchParts[2] || 'gs';
                    if (!flags.includes('g')) flags += 'g';
                }

                const regex = new RegExp(pattern, flags);
                displayedContent = displayedContent.replace(regex, '').trim();
            } catch (e) {
                console.error("渲染时隐藏状态码失败:", e);
            }
        }

        bubbleElement.innerHTML = `<span class="bubble-content">${DOMPurify.sanitize(displayedContent)}</span>`;
        if (!chat.useCustomBubbleCss) {
            bubbleElement.style.backgroundColor = bubbleTheme.bg;
            bubbleElement.style.color = bubbleTheme.text;
        }
    }
    const nicknameHTML = (currentChatType === 'group' && !isSent && senderNickname) ? `<div class="group-nickname">${senderNickname}</div>` : '';

    // Time Stamp Logic
    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.textContent = timeString;

    const timestampStyle = chat.timestampStyle || 'bubble';

    // Append Time Stamp to Bubble (if style is bubble)
    // 注意：小票气泡 (receipt-bubble) 内部自带时间，不需要外部时间戳
    // 红包 (red-packet-card) 也不需要外部时间戳
    if (bubbleElement && timestampStyle === 'bubble' && !bubbleElement.classList.contains('receipt-bubble') && !bubbleElement.classList.contains('red-packet-card')) {
        if(message.uwuDiary110||message.uwuNote97||message.uwuKeepsake97||message.media97||message.uwuToolCard||message.uwuReviewShare||message.uwuSongShare||message.uwuBookQuote){
            const cardStack=document.createElement('div');cardStack.className='uwu-card-with-time';cardStack.append(bubbleElement,timeSpan);bubbleElement=cardStack;
        }else bubbleElement.appendChild(timeSpan);
    }
    
    // Create message-info element manually to allow appending timestamp if needed
    const messageInfo = document.createElement('div');
    messageInfo.className = 'message-info';
    const avatarImg = document.createElement('img');
    avatarImg.src = avatarUrl;
    avatarImg.className = avatarClass;
    messageInfo.appendChild(avatarImg);

    if (timestampStyle === 'avatar') {
        messageInfo.appendChild(timeSpan);
    }

    if (currentChatType === 'group' && !isSent) {
        // 群聊接收消息布局：头像左侧，右侧垂直排列昵称和气泡
        const contentContainer = document.createElement('div');
        contentContainer.className = 'group-msg-content';
        
        if (nicknameHTML) {
            contentContainer.innerHTML += nicknameHTML;
        }
        
        if (bubbleElement) {
            if (quote) {
                let quotedSenderName = '';
                if (quote.senderId === 'user_me') {
                    quotedSenderName = (currentChatType === 'private')
                        ? ((chat.myRemarkName && chat.myRemarkName.trim()) || chat.myName || 'User')
                        : chat.me.nickname;
                } else {
                    if (currentChatType === 'private') {
                        quotedSenderName = chat.remarkName;
                    } else {
                        const sender = chat.members.find(m => m.id === quote.senderId);
                        quotedSenderName = sender ? sender.groupNickname : '未知成员';
                    }
                }
                const quoteDiv = document.createElement('div');
                quoteDiv.className = 'quoted-message';
                const sanitizedQuotedText = DOMPurify.sanitize(quote.content, { ALLOWED_TAGS: [] });
                quoteDiv.innerHTML = `<span class="quoted-sender">回复 ${quotedSenderName}</span><p class="quoted-text">${sanitizedQuotedText}</p>`;
                bubbleElement.prepend(quoteDiv);
            }
            contentContainer.appendChild(bubbleElement);
        }
        
        bubbleRow.appendChild(messageInfo);
        bubbleRow.appendChild(contentContainer);
    } else {
        // 私聊或发送消息布局：保持原样
        bubbleRow.appendChild(messageInfo);
        
        if (bubbleElement) {
            if (quote) {
                let quotedSenderName = '';
                if (quote.senderId === 'user_me') {
                    quotedSenderName = (currentChatType === 'private')
                        ? ((chat.myRemarkName && chat.myRemarkName.trim()) || chat.myName || 'User')
                        : chat.me.nickname;
                } else {
                    if (currentChatType === 'private') {
                        quotedSenderName = chat.remarkName;
                    } else {
                        const sender = chat.members.find(m => m.id === quote.senderId);
                        quotedSenderName = sender ? sender.groupNickname : '未知成员';
                    }
                }
                const quoteDiv = document.createElement('div');
                quoteDiv.className = 'quoted-message';
                const sanitizedQuotedText = DOMPurify.sanitize(quote.content, { ALLOWED_TAGS: [] });
                quoteDiv.innerHTML = `<span class="quoted-sender">回复 ${quotedSenderName}</span><p class="quoted-text">${sanitizedQuotedText}</p>`;
                bubbleElement.prepend(quoteDiv);
            }
            bubbleRow.appendChild(bubbleElement);
        }
    }
    wrapper.prepend(bubbleRow);
    window.UwUTextEffects95?.decorate(wrapper,message);
    return uwuQuoteMetadata111(wrapper, message, chat);
}

// 全局函数：处理代付响应
window.sendPayResponse = async function(msgId, action) {
    const chat = db.characters.find(c => c.id === currentChatId);
    if (!chat) return;

    const msg = chat.history.find(m => m.id === msgId);
    if (!msg) return;

    if(msg.payStatus||Date.now()-Number(msg.timestamp)>15*60000){if(!msg.payStatus)msg.payStatus='expired';await saveData();renderMessages(false,false);return showToast('代付请求已处理或已失效');}
    msg.payResolvedAt96=Date.now();
    // 1. 更新原消息状态
    msg.payStatus = action === 'pay' ? 'paid' : 'rejected';
    
    // 2. 刷新界面（为了让原消息的小票立刻变成"已支付/已拒绝"状态）
    const wrapper = document.querySelector(`.message-wrapper[data-id="${msgId}"]`);
    if (wrapper) {
         renderMessages(false, false);
    }

    // 3. 构建指令消息文本
    const myName = chat.myName;
    const realName = chat.realName;
    let responseText = '';
    
    if (action === 'pay') {
        responseText = `[${myName}同意了${realName}的代付请求]`;
    } else {
        responseText = `[${myName}拒绝了${realName}的代付请求]`;
    }

    // 4. 【关键修改】直接手动添加消息，不走发送按钮逻辑
    // 这样就不会被包裹成 [用户消息：...] 了
    const newMsg = {
        id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        role: 'user',
        content: responseText,
        timestamp: Date.now(),
        // isStatusUpdate: true 标记为状态更新类消息
    };

    chat.history.push(newMsg);
    
    // 5. 保存并刷新到底部
    if (typeof saveData === 'function') await saveData(); 
    renderMessages(false, true); 
};


function addMessageBubble(message, targetChatId, targetChatType, options={}) {
    if(targetChatId===currentChatId&&targetChatType===currentChatType)uwuRefreshChatHeader111();
    if(message._uwuReplay94)return;
    if(targetChatType==='private'&&message.role==='assistant'&&/^\[.*?的语音[：:]/.test(message.content||'')&&window.UwUVoice98){const voiceChat98=db.characters.find(c=>c.id===targetChatId);if(voiceChat98)try{UwUVoice98.onNewMessage(message,voiceChat98);}catch(e){showToast(e.message);}}
    const motionSnapshot95=window.UwUChatMotion95?.beforeAppend();
    window.MessageNotifications?.notify(message, targetChatId, targetChatType, {defer:!!message.roundId});
    if (targetChatType === 'private' && message.role === 'user' && !options.suppressUserWake) {
        const target = db.characters.find(c => c.id === targetChatId);
        if (target) window.SmartMessaging.onUser(target, message,options.userWillSave===true);
    }
    const historyJump110 = window.UwUHistoryJump110;
    if (historyJump110 && historyJump110.chatId === targetChatId && historyJump110.type === targetChatType && targetChatId === currentChatId && targetChatType === currentChatType) return;
    if (targetChatId !== currentChatId || targetChatType !== currentChatType) {
        const senderChat = (targetChatType === 'private')
            ? db.characters.find(c => c.id === targetChatId)
            : db.groups.find(g => g.id === targetChatId);
        
        if (senderChat) {
            let invisibleRegex;
            const momentsRegexSource = /\[(?:.*?)\s*(?:发布了一条(?:带图)?动态|评论了.*?|回复.*?|更新了个性签名)[：:][\s\S]+?\]/.source;
            if (senderChat.showStatusUpdateMsg) {
                // 在末尾添加 |<thinking>[\s\S]*?<\/thinking>
                invisibleRegex = new RegExp([
                    /\[system:.*?\]/.source,
                    /\[.*?已接收礼物\]/.source,
                    /\[.*?(?:接收|退回).*?的转账\]/.source,
                    /\[.*?同意了.*?的代付请求\]/.source,
                    /\[.*?拒绝了.*?的代付请求\]/.source,
                    /\[.*?拒绝了.*?的(?:视频|语音)通话\]/.source,
                    /<thinking>[\s\S]*?<\/thinking>/.source,
                    /^<thinking>[\s\S]*/.source,
                    momentsRegexSource
                ].join('|'));
            } else {
                // 在末尾添加 |<thinking>[\s\S]*?<\/thinking>
                invisibleRegex = new RegExp([
                    /\[system:.*?\]/.source,
                    /\[.*?更新状态为：.*?\]/.source,
                    /\[.*?已接收礼物\]/.source,
                    /\[.*?(?:接收|退回).*?的转账\]/.source,
                    /\[.*?同意了.*?的代付请求\]/.source,
                    /\[.*?拒绝了.*?的代付请求\]/.source,
                    /\[.*?拒绝了.*?的(?:视频|语音)通话\]/.source,
                    /<thinking>[\s\S]*?<\/thinking>/.source,
                    /^<thinking>[\s\S]*/.source,
                    momentsRegexSource
                ].join('|'));
            }
            if (!invisibleRegex.test(message.content)) {
                senderChat.unreadCount = (senderChat.unreadCount || 0) + 1;
                saveData(); 
                renderChatList(); 
            }
            
            let senderName, senderAvatar;
            if (targetChatType === 'private') {
                senderName = senderChat.remarkName;
                senderAvatar = senderChat.avatar;
            } else { 
                const sender = senderChat.members.find(m => m.id === message.senderId);
                if (sender) {
                    senderName = sender.groupNickname;
                    senderAvatar = sender.avatar;
                } else { 
                    senderName = senderChat.name;
                    senderAvatar = senderChat.avatar;
                }
            }

            let previewText = message.content;

            if (previewText && typeof previewText === 'string') {
                previewText = previewText.replace(/\[(.+?)发来的(照片|视频)[：:]([\s\S]+?)\]/g, '[$1发来的照片/视频：$3]');
            }

            const textMatch = previewText.match(/\[.*?的消息[：:]([\s\S]+?)\]/);
            if (textMatch) {
                previewText = textMatch[1];
            } else {
                if (/\[.*?的表情包[：:].*?\]/.test(previewText)) previewText = '[表情包]';
                else if (/\[.*?的语音[：:].*?\]/.test(previewText)) previewText = '[语音]';
                else if (/\[.*?发来的照片\/视频[：:].*?\]/.test(previewText)) previewText = '[照片/视频]';
                else if (/\[.*?的转账[：:].*?\]/.test(previewText) || /\[.*?向.*?转账[：:].*?\]/.test(previewText)) previewText = '[转账]';
                else if (/\[.*?送来的礼物[：:].*?\]/.test(previewText)) previewText = '[礼物]';
                else if (/\[.*?发来了一张图片[：:]\]/.test(previewText)) previewText = '[图片]';
                else if (/\[商城订单[：:].*?\]/.test(previewText)) previewText = '[商城订单]';
                else if (message.parts && message.parts.some(p => p.type === 'html')) previewText = '[互动]';
            }
            
            showToast({
                avatar: senderAvatar,
                name: senderName,
                message: previewText.substring(0, 30)
            });
        }
        return; 
    }

    if (currentChatType === 'private') {
        const character = db.characters.find(c => c.id === currentChatId);
        const updateStatusRegex = new RegExp(`\\[${character.realName}更新状态为[：:](.*?)\\]`);
        const transferActionRegex = new RegExp(`\\[${character.realName}(接收|退回)${character.myName}的转账\\]`);
        const giftReceivedRegex = new RegExp(`\\[${character.realName}已接收礼物\\]`);
        
        // AI 回应用户的代付请求
        const payAgreedRegex = new RegExp(`\\[${character.realName}同意了${character.myName}的代付请求\\]`);
        const payRejectedRegex = new RegExp(`\\[${character.realName}拒绝了${character.myName}的代付请求\\]`);
        
        // 用户回应 AI 的代付请求 (通过按钮触发的指令)
        const userPayAgreedRegex = new RegExp(`\\[${character.myName}同意了${character.realName}的代付请求\\]`);
        const userPayRejectedRegex = new RegExp(`\\[${character.myName}拒绝了${character.realName}的代付请求\\]`);

        if (message.content.match(updateStatusRegex)) {
            character.status = message.content.match(updateStatusRegex)[1];
            chatRoomStatusText.textContent = character.status;
            if (!character.showStatusUpdateMsg) {
                return;
            }
        }
        if (message.content.match(giftReceivedRegex) && message.role === 'assistant') {
            const lastPendingGiftIndex = character.history.slice().reverse().findIndex(m => m.role === 'user' && /送来的礼物[：:]/.test(m.content) && m.giftStatus !== 'received');
            if (lastPendingGiftIndex !== -1) {
                const actualIndex = character.history.length - 1 - lastPendingGiftIndex;
                const giftMsg = character.history[actualIndex];
                giftMsg.giftStatus = 'received';
                const giftCardOnScreen = messageArea.querySelector(`.message-wrapper[data-id="${giftMsg.id}"] .gift-card`);
                if (giftCardOnScreen) {
                    giftCardOnScreen.classList.add('received');
                }
            }
            return;
        }
        
        // 处理 AI 同意/拒绝 用户的请求
        if (message.content.match(payAgreedRegex) && message.role === 'assistant') {
            const lastPendingPayIndex = character.history.slice().reverse().findIndex(m => m.role === 'user' && /发起了代付请求[：:]/.test(m.content) && !m.payStatus && Date.now()-Number(m.timestamp)<15*60000);
            if (lastPendingPayIndex !== -1) {
                const actualIndex = character.history.length - 1 - lastPendingPayIndex;
                const payMsg = character.history[actualIndex];
                payMsg.payResolvedAt96=Date.now();payMsg.payStatus = 'paid';
                const receiptBubble = messageArea.querySelector(`.message-wrapper[data-id="${payMsg.id}"] .receipt-bubble`);
                if (receiptBubble) {
                    // 更新底部状态文字
                    const statusSpan = receiptBubble.querySelector('.pay-status-text');
                    if (statusSpan) statusSpan.textContent = '已支付';
                    
                    // 移除操作按钮（如果存在）
                    const actions = receiptBubble.querySelector('.receipt-actions');
                    if (actions) actions.remove();
                }
            }
            return;
        }
        if (message.content.match(payRejectedRegex) && message.role === 'assistant') {
            const lastPendingPayIndex = character.history.slice().reverse().findIndex(m => m.role === 'user' && /发起了代付请求[：:]/.test(m.content) && !m.payStatus && Date.now()-Number(m.timestamp)<15*60000);
            if (lastPendingPayIndex !== -1) {
                const actualIndex = character.history.length - 1 - lastPendingPayIndex;
                const payMsg = character.history[actualIndex];
                payMsg.payStatus = 'rejected';
                const receiptBubble = messageArea.querySelector(`.message-wrapper[data-id="${payMsg.id}"] .receipt-bubble`);
                if (receiptBubble) {
                    // 更新底部状态文字
                    const statusSpan = receiptBubble.querySelector('.pay-status-text');
                    if (statusSpan) statusSpan.textContent = '已拒绝';
                    
                    // 移除操作按钮（如果存在）
                    const actions = receiptBubble.querySelector('.receipt-actions');
                    if (actions) actions.remove();
                }
            }
            return;
        }

        // 处理 用户 同意/拒绝 AI 的请求 (虽然按钮点击已经更新了状态，但这里处理指令消息本身的显示逻辑)
        if (message.content.match(userPayAgreedRegex) || message.content.match(userPayRejectedRegex)) {
            // 这条指令消息本身不需要特殊处理，它只是作为聊天记录存在
            // 状态更新已经在 sendPayResponse 中完成了
            // 但如果用户手动输入这条指令，我们也应该尝试更新状态
            if (message.role === 'user') {
                 const isAgreed = !!message.content.match(userPayAgreedRegex);
                 const lastPendingPayIndex = character.history.slice().reverse().findIndex(m => m.role === 'assistant' && /发起了代付请求[：:]/.test(m.content) && !m.payStatus && Date.now()-Number(m.timestamp)<15*60000);
                 
                 if (lastPendingPayIndex !== -1) {
                    const actualIndex = character.history.length - 1 - lastPendingPayIndex;
                    const payMsg = character.history[actualIndex];
                    // 只有当状态未设置时才更新，避免覆盖
                    if (!payMsg.payStatus) {
                        payMsg.payResolvedAt96=Date.now();payMsg.payStatus = isAgreed ? 'paid' : 'rejected';
                        // 刷新界面
                        renderMessages(false, false);
                    }
                 }
            }
            return;
        }

        if (message.content.match(transferActionRegex) && message.role === 'assistant') {
            const action = message.content.match(transferActionRegex)[1];
            const statusToSet = action === '接收' ? 'received' : 'returned';
            const lastPendingTransferIndex = character.history.slice().reverse().findIndex(m => m.role === 'user' && /给你转账[：:]/.test(m.content) && m.transferStatus === 'pending');
            if (lastPendingTransferIndex !== -1) {
                const actualIndex = character.history.length - 1 - lastPendingTransferIndex;
                const transferMsg = character.history[actualIndex];
                transferMsg.transferStatus = statusToSet;
                const transferCardOnScreen = messageArea.querySelector(`.message-wrapper[data-id="${transferMsg.id}"] .transfer-card`);
                if (transferCardOnScreen) {
                    transferCardOnScreen.classList.remove('received', 'returned');
                    transferCardOnScreen.classList.add(statusToSet);
                    const statusElem = transferCardOnScreen.querySelector('.transfer-status');
                    if (statusElem) statusElem.textContent = statusToSet === 'received' ? '已收款' : '已退回';
                }
            }
        } else {
            let isContinuous = false;
            let invisibleRegex;
            const momentsRegexSource = /\[(?:.*?)\s*(?:发布了一条(?:带图)?动态|评论了.*?|回复.*?|更新了个性签名)[：:][\s\S]+?\]/.source;
            if (character.showStatusUpdateMsg) {
                // 修改：正则末尾增加了 |<thinking>[\s\S]*?<\/thinking>
                invisibleRegex = new RegExp([
                    /\[.*?(?:接收|退回).*?的转账\]/.source,
                    /\[.*?已接收礼物\]/.source,
                    /\[.*?同意了.*?的代付请求\]/.source,
                    /\[.*?拒绝了.*?的代付请求\]/.source,
                    /\[system:.*?\]/.source,
                    /\[.*?邀请.*?加入了群聊\]/.source,
                    /\[.*?修改群名为：.*?\]/.source,
                    /\[system-display:.*?\]/.source,
                    /\[.*?拒绝了.*?的(?:视频|语音)通话\]/.source,
                    /<thinking>[\s\S]*?<\/thinking>/.source,
                    /^<thinking>[\s\S]*/.source,
                    momentsRegexSource
                ].join('|'));
            } else {
                // 修改：正则末尾增加了 |<thinking>[\s\S]*?<\/thinking>
                invisibleRegex = new RegExp([
                    /\[.*?(?:接收|退回).*?的转账\]/.source,
                    /\[.*?更新状态为：.*?\]/.source,
                    /\[.*?已接收礼物\]/.source,
                    /\[.*?同意了.*?的代付请求\]/.source,
                    /\[.*?拒绝了.*?的代付请求\]/.source,
                    /\[system:.*?\]/.source,
                    /\[.*?邀请.*?加入了群聊\]/.source,
                    /\[.*?修改群名为：.*?\]/.source,
                    /\[system-display:.*?\]/.source,
                    /\[.*?拒绝了.*?的(?:视频|语音)通话\]/.source,
                    /<thinking>[\s\S]*?<\/thinking>/.source,
                    /^<thinking>[\s\S]*/.source,
                    momentsRegexSource
                ].join('|'));
            }
            const isSystemMsg = /\[system:.*?\]|\[system-display:.*?\]/.test(message.content);

            if (!isSystemMsg && character.history.length > 1) {
                let prevMsg = null;
                for (let i = character.history.length - 2; i >= 0; i--) {
                    const candidate = character.history[i];
                    if (!invisibleRegex.test(candidate.content)) {
                        prevMsg = candidate;
                        break;
                    }
                }

                if (prevMsg) {
                    const currentSender = message.role === 'user' ? 'user' : (message.senderId || 'assistant');
                    const prevSender = prevMsg.role === 'user' ? 'user' : (prevMsg.senderId || 'assistant');
                    const timeGap = message.timestamp - prevMsg.timestamp;
                    const isTimeClose = timeGap < 10 * 60 * 1000;

                    if (currentSender === prevSender && isTimeClose) {
                        isContinuous = true;
                    }
                }
            }

            const bubbleElement = createMessageBubbleElement(message, isContinuous);
            if (bubbleElement) {
                // Check for timestamp display
                const history = character.history;
                let shouldShowTimestamp = false;
                if (history.length >= 2) {
                    const prevMsg = history[history.length - 2];
                    const timeDiff = message.timestamp - prevMsg.timestamp;
                    const isSameDay = new Date(message.timestamp).toDateString() === new Date(prevMsg.timestamp).toDateString();
                    if (timeDiff > 10 * 60 * 1000 || !isSameDay) {
                        shouldShowTimestamp = true;
                    }
                } else if (history.length === 1) {
                    shouldShowTimestamp = true;
                }

                if (shouldShowTimestamp) {
                    const timeDivider = document.createElement('div');
                    timeDivider.className = 'message-wrapper system-notification time-divider';
                    const timeText = formatTimeDivider(message.timestamp);
                    timeDivider.innerHTML = `<div class="system-notification-bubble" style="background-color: transparent; color: #999; font-size: 12px; padding: 2px 8px;">${timeText}</div>`;
                    UwUChatTime115.bind(timeDivider.firstElementChild, uwuChatMessageTime111(message.timestamp), character);
                    messageArea.appendChild(timeDivider);
                }

                messageArea.appendChild(bubbleElement);
            uwuRefreshPostTimes114(messageArea);
                if(!window.UwUChatMotion95?.afterAppend(motionSnapshot95,bubbleElement)) { window.ChatViewWork ? window.ChatViewWork.scroll(messageArea) : (messageArea.scrollTop = messageArea.scrollHeight); }
            }
        }
    } else { 
        const group = db.groups.find(g => g.id === currentChatId);
        let isContinuous = false;
        let invisibleRegex;
        const momentsRegexSource = /\[(?:.*?)\s*(?:发布了一条(?:带图)?动态|评论了.*?|回复.*?|更新了个性签名)[：:][\s\S]+?\]/.source;
        if (group.showStatusUpdateMsg) {
            // 修改：正则末尾增加了 |<thinking>[\s\S]*?<\/thinking>
            invisibleRegex = new RegExp([
                /\[.*?(?:接收|退回).*?的转账\]/.source,
                /\[.*?已接收礼物\]/.source,
                /\[system:.*?\]/.source,
                /\[.*?邀请.*?加入了群聊\]/.source,
                /\[.*?修改群名为：.*?\]/.source,
                /\[system-display:.*?\]/.source,
                /\[.*?拒绝了.*?的(?:视频|语音)通话\]/.source,
                /<thinking>[\s\S]*?<\/thinking>/.source,
                /^<thinking>[\s\S]*/.source,
                momentsRegexSource
            ].join('|'));
        } else {
            // 修改：正则末尾增加了 |<thinking>[\s\S]*?<\/thinking>
            invisibleRegex = new RegExp([
                /\[.*?(?:接收|退回).*?的转账\]/.source,
                /\[.*?更新状态为：.*?\]/.source,
                /\[.*?已接收礼物\]/.source,
                /\[system:.*?\]/.source,
                /\[.*?邀请.*?加入了群聊\]/.source,
                /\[.*?修改群名为：.*?\]/.source,
                /\[system-display:.*?\]/.source,
                /\[.*?拒绝了.*?的(?:视频|语音)通话\]/.source,
                /<thinking>[\s\S]*?<\/thinking>/.source,
                /^<thinking>[\s\S]*/.source,
                momentsRegexSource
            ].join('|'));
        }
        const isSystemMsg = /\[system:.*?\]|\[system-display:.*?\]/.test(message.content);

        if (!isSystemMsg && group.history.length > 1) {
            let prevMsg = null;
            for (let i = group.history.length - 2; i >= 0; i--) {
                const candidate = group.history[i];
                if (!invisibleRegex.test(candidate.content)) {
                    prevMsg = candidate;
                    break;
                }
            }

            if (prevMsg) {
                const currentSender = message.role === 'user' ? 'user' : (message.senderId || 'assistant');
                const prevSender = prevMsg.role === 'user' ? 'user' : (prevMsg.senderId || 'assistant');
                const timeGap = message.timestamp - prevMsg.timestamp;
                const isTimeClose = timeGap < 10 * 60 * 1000;

                if (currentSender === prevSender && isTimeClose) {
                    isContinuous = true;
                }
            }
        }

        const bubbleElement = createMessageBubbleElement(message, isContinuous);
        if (bubbleElement) {
            // Check for timestamp display
            const history = group.history;
            let shouldShowTimestamp = false;
            if (history.length >= 2) {
                const prevMsg = history[history.length - 2];
                const timeDiff = message.timestamp - prevMsg.timestamp;
                const isSameDay = new Date(message.timestamp).toDateString() === new Date(prevMsg.timestamp).toDateString();
                if (timeDiff > 10 * 60 * 1000 || !isSameDay) {
                    shouldShowTimestamp = true;
                }
            } else if (history.length === 1) {
                shouldShowTimestamp = true;
            }

            if (shouldShowTimestamp) {
                const timeDivider = document.createElement('div');
                timeDivider.className = 'message-wrapper system-notification time-divider';
                const timeText = formatTimeDivider(message.timestamp);
                timeDivider.innerHTML = `<div class="system-notification-bubble" style="background-color: transparent; color: #999; font-size: 12px; padding: 2px 8px;">${timeText}</div>`;
                UwUChatTime115.bind(timeDivider.firstElementChild, uwuChatMessageTime111(message.timestamp), group);
                messageArea.appendChild(timeDivider);
            }

            messageArea.appendChild(bubbleElement);
            uwuRefreshPostTimes114(messageArea);
            if(!window.UwUChatMotion95?.afterAppend(motionSnapshot95,bubbleElement)) { window.ChatViewWork ? window.ChatViewWork.scroll(messageArea) : (messageArea.scrollTop = messageArea.scrollHeight); }
        }
    }
}


// Additive quote and header metadata. No theme-specific rendering.
function uwuChatMessageTime111(value) {
 const n=Number(value); if(!Number.isFinite(n)||n<=0)return null;
 const date=new Date(n); if(Number.isNaN(date.getTime()))return null;
 const pad=n=>String(n).padStart(2,'0');
 return {timestamp:n,iso:date.toISOString(),date:date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate()),clock:pad(date.getHours())+':'+pad(date.getMinutes())};
}
function uwuBindBareTime115(node, message, chat) {
 UwUChatTime115.bind(node, uwuChatMessageTime111(message.timestamp), chat);
 return node;
}
function uwuChatAuthor111(chat, senderId, role) {
 const user=senderId==='user_me'||role==='user';
 if(user)return {side:'user',name:chat.myRemarkName?.trim()||chat.myName||chat.me?.nickname||'User',avatar:chat.myAvatar||chat.me?.avatar||''};
 const member=currentChatType==='group'?chat.members?.find(m=>m.id===senderId):null;
 return {side:'char',name:member?.groupNickname||chat.remarkName||chat.realName||chat.name||'Character',avatar:member?.avatar||chat.avatar||''};
}
function uwuFillTime111(node, value, chat) {
 const time=uwuChatMessageTime111(value);
 node.textContent=time?time.date+' '+time.clock:'';
 for(const key of ['timestamp','date','clock']) {if(time)node.dataset[key]=String(time[key]);else delete node.dataset[key];}
 if(time)node.dateTime=time.iso;else node.removeAttribute('datetime');
 UwUChatTime115.bind(node, time, chat, true);
 return time;
}


// Optional metadata only. Legacy skins receive no extra child nodes.
function uwuMetadataRequested111(chat, name) {
 return Boolean(chat?.useCustomBubbleCss && String(chat.customBubbleCss||'').includes('.'+name));
}
function uwuRenderWithdrawnNotice114(wrapper, message, chat) {
    const {role, originalContent} = message;
    wrapper.className = 'message-wrapper system-notification';
    if (message.isContextDisabled) wrapper.classList.add('context-disabled');
    const withdrawnText = (role === 'user') ? '你撤回了一条消息' : `${chat.remarkName || chat.name}撤回了一条消息`;
    wrapper.innerHTML = `<div><span class="withdrawn-message">${withdrawnText}</span></div><div class="withdrawn-content">${originalContent ? DOMPurify.sanitize(originalContent.replace(/\[.*?的消息[：:]([\s\S]+?)\]/, '$1')) : ''}</div>`;
    const withdrawnMessageSpan = wrapper.querySelector('.withdrawn-message');
    if (withdrawnMessageSpan) {
        withdrawnMessageSpan.addEventListener('click', () => {
            const withdrawnContent = wrapper.querySelector('.withdrawn-content');
            if (withdrawnContent && withdrawnContent.textContent.trim()) {
                withdrawnContent.classList.toggle('active');
            }
        });
    }
    return uwuQuoteMetadata111(wrapper, message, chat);
}

function uwuSyncWithdrawnPost114(wrapper, message, chat) {
    let header = wrapper.querySelector(':scope > .uwu-withdrawn-meta114');
    const notice = wrapper.querySelector('.withdrawn-message');
    if (!message.isWithdrawn || !notice || !uwuMetadataRequested111(chat, 'uwu-withdrawn-post114')) {
        header?.remove();
        wrapper.classList.remove('uwu-withdrawn-post114');
        return;
    }

    if (!header) {
        header = document.createElement('div');
        header.className = 'uwu-withdrawn-meta114';
        wrapper.prepend(header);
    }
    wrapper.classList.add('uwu-withdrawn-post114');

    const author = uwuChatAuthor111(chat, message.senderId, message.role);
    const member = currentChatType === 'group' && author.side !== 'user'
        ? chat.members?.find(item => String(item.id) === String(message.senderId))
        : null;
    const avatarUrl = currentChatType === 'group' && author.side !== 'user' ? member?.avatar : author.avatar;
    header.dataset.sender = author.side;
    header.dataset.senderName = member?.groupNickname || member?.realName || author.name;
    if (message.senderId != null) header.dataset.senderId = String(message.senderId);
    else delete header.dataset.senderId;

    header.replaceChildren();
    if (avatarUrl) {
        const avatar = document.createElement('img');
        avatar.className = 'uwu-withdrawn-avatar114';
        avatar.alt = '';
        avatar.src = avatarUrl;
        header.append(avatar);
    }

    const name = document.createElement('span');
    name.className = 'uwu-withdrawn-sender114';
    name.textContent = header.dataset.senderName;
    header.append(name);

    const times = document.createElement('div');
    times.className = 'uwu-withdrawn-times114';
    for (const [className, label, value] of [
        ['uwu-withdrawn-sent-time114', '发送', message.timestamp],
        ['uwu-withdrawn-retract-time114', '撤回', message.withdrawnAt111]
    ]) {
        const time = document.createElement('time');
        time.className = className;
        if (!uwuFillTime111(time, value, chat)) continue;
        const field = document.createElement('span');
        field.className = 'uwu-withdrawn-time-field114';
        const caption = document.createElement('span');
        caption.className = 'uwu-withdrawn-time-label114';
        caption.textContent = label;
        field.append(caption, time);
        times.append(field);
    }
    if (times.childElementCount) header.append(times);
}

function uwuSyncPostTime114(time, timestamp, chat) {
 const stamp = uwuFillTime111(time, timestamp, chat);
 if (stamp) time.textContent = uwuPostTime111(stamp.timestamp);
 return stamp;
}

function uwuPostTheme114(chat) {
 return Boolean(chat?.useCustomBubbleCss && String(chat.customBubbleCss || '').includes('--uwu-v114-theme:'));
}
const uwuTransferDate114 = new Intl.DateTimeFormat('en-US', {
 month: 'short', day: 'numeric', year: 'numeric'
});
const uwuTransferClock114 = new Intl.DateTimeFormat('en-US', {
 hour: 'numeric', minute: '2-digit', hour12: true
});
function uwuVoiceClock114(seconds) {
 const duration = Math.max(0, Math.round(Number(seconds) || 0));
 return Math.floor(duration / 60) + ':' + String(duration % 60).padStart(2, '0');
}
function uwuPostTime111(timestamp, now = Date.now()) {
 const time = uwuChatMessageTime111(timestamp);
 if (!time) return '';
 const {minutes} = UwUChatTime115.elapsed(time.timestamp, now);
 if (minutes < 1) return '刚刚';
 if (minutes < 60) return minutes + '分钟前';
 if (minutes < 1440) return Math.floor(minutes / 60) + '小时前';
 const [year, month, day] = time.date.split('-').map(Number);
 return year + '年' + month + '月' + day + '日 ' + time.clock;
}
function uwuRefreshPostTimes114(area, now = Date.now()) {
 if (!area?.querySelector('[data-uwu-post-meta]')) return;
 for (const time of area.querySelectorAll(
  ':scope > .message-wrapper[data-uwu-post-meta] > .message-bubble-row > .message-info > .uwu-post-time114, ' +
  ':scope > .message-wrapper[data-uwu-post-meta] .quoted-message .quoted-time[data-timestamp]'
 )) {
  UwUChatTime115.refresh(time, now);
  const text = uwuPostTime111(time.dataset.timestamp, now);
  if (time.textContent !== text) time.textContent = text;
 }
}
function uwuRefreshTimeData115() {
 const now = Date.now();
 const area = document.getElementById('message-area');
 uwuRefreshPostTimes114(area, now);
 UwUChatTime115.refreshWithin(area, now);
 UwUChatTime115.refreshWithin(document.getElementById('chat-room-header-default'), now);
}
setInterval(uwuRefreshTimeData115, 60000);
document.addEventListener('visibilitychange', () => {
 if (!document.hidden) uwuRefreshTimeData115();
});
window.addEventListener('pageshow', uwuRefreshTimeData115);
function uwuQuoteMetadata111(wrapper, message, chat) {
 if (!wrapper || !chat) return wrapper;
 if (UwUChatTime115.enabled(chat)) {
  const messageTime = uwuChatMessageTime111(message.timestamp);
  const ordinaryTimes = wrapper.querySelectorAll('.message-time, .receipt-delivery-info > span:nth-child(2)');
  if (ordinaryTimes.length) {
   for (const node of ordinaryTimes) UwUChatTime115.bind(node, messageTime, chat);
  } else {
   UwUChatTime115.bind(wrapper, messageTime, chat);
  }
 }
 if (message.isWithdrawn || wrapper.classList.contains('uwu-withdrawn-post114')) {
  uwuSyncWithdrawnPost114(wrapper, message, chat);
 }
 const postTheme = uwuPostTheme114(chat);
 const info = wrapper.querySelector(':scope > .message-bubble-row > .message-info');
 let postTime = info?.querySelector(':scope > .uwu-post-time114');
 if (postTheme && info) {
  if (!postTime) {
   postTime = document.createElement('time');
   postTime.className = 'uwu-post-time114';
   info.append(postTime);
  }
  uwuSyncPostTime114(postTime, message.timestamp, chat);
  wrapper.dataset.uwuPostMeta = '';
 } else {
  postTime?.remove();
  delete wrapper.dataset.uwuPostMeta;
 }
 if (postTheme && uwuMetadataRequested111(chat, 'uwu-transfer-date111')) {
  const card = wrapper.querySelector('.transfer-card');
  const stamp = card && uwuChatMessageTime111(message.timestamp);
  if (stamp) {
   const date = new Date(stamp.timestamp);
   const label = document.createElement('time');
   label.className = 'uwu-transfer-date111';
   label.dateTime = stamp.iso;
   UwUChatTime115.bind(label, stamp, chat);
   label.textContent = uwuTransferDate114.format(date) + ' at ' + uwuTransferClock114.format(date);
   card.append(label);
  }
 }
 if (postTheme && uwuMetadataRequested111(chat, 'uwu-voice-clock111')) {
  const bubble = wrapper.querySelector('.voice-bubble');
  const raw = bubble?.querySelector('.duration')?.textContent?.match(/^\s*(\d+)["″]\s*$/);
  const recorded = Number(message.userAudio99?.duration);
  const seconds = recorded > 0 ? recorded : raw ? Number(raw[1]) : null;
  if (bubble && seconds !== null) {
   const label = document.createElement('span');
   label.className = 'uwu-voice-clock111';
   label.textContent = uwuVoiceClock114(seconds);
   bubble.append(label);
  }
 }
 if (!message.quote) return wrapper;
 const quote=message.quote;
 const original=quote.messageId==null?null:chat.history?.find(m=>String(m.id)===String(quote.messageId));
 const author=uwuChatAuthor111(chat,original?.senderId||quote.senderId,original?.role);
 for(const block of wrapper.querySelectorAll('.quoted-message')) {
  block.dataset.sender=author.side;block.dataset.senderName=author.name;
  if(quote.messageId!=null)block.dataset.messageId=String(quote.messageId);
  const stamp=uwuChatMessageTime111(original?.timestamp);
  for(const name of ['timestamp','date','clock']){if(stamp)block.dataset[name]=String(stamp[name]);else delete block.dataset[name];}
  UwUChatTime115.bind(block, stamp, chat, true);
  block.style.setProperty('--quoted-avatar','url('+JSON.stringify(author.avatar)+')');
  let node=block.querySelector('.quoted-time');
  if(!uwuMetadataRequested111(chat,'quoted-time')){node?.remove();continue;}
  if(!node){node=document.createElement('time');node.className='quoted-time';block.append(node);}
  if (postTheme) uwuSyncPostTime114(node, stamp?.timestamp, chat);
  else uwuFillTime111(node, stamp?.timestamp, chat);
 }
 return wrapper;
}
// Latest messages for both participants; optional header hooks, no network activity.
function uwuLastMessageTimes111(chat) {
 const latest={char:null,user:null};
 for(const m of chat?.history||[]) {
  const side=m.role==='assistant'?'char':m.role==='user'?'user':null;
  if(!side||m.isThinking||m.isStatusUpdate||m.isWithdrawn||m.uwuReviewCommand||m.uwuToolCommand||m.uwuMusicResult)continue;
  const content=String(m.content||'').replace(/<thinking>[\s\S]*?<\/thinking>/g,'').trim();
  if(!content||/^<thinking>/.test(content)||/^\[(?:system(?:-display)?[:：])/i.test(content))continue;
  const time=uwuChatMessageTime111(m.timestamp);
  if(time&&time.timestamp>(latest[side]||0))latest[side]=time.timestamp;
 }
 return latest;
}
function uwuLastCharMessage111(chat) {return uwuLastMessageTimes111(chat).char;}
function uwuLastUserMessage111(chat) {return uwuLastMessageTimes111(chat).user;}
function uwuRefreshChatHeader111(chat) {
 if(!chat&&typeof db!=='undefined')chat=currentChatType==='private'?db.characters.find(c=>c.id===currentChatId):db.groups.find(c=>c.id===currentChatId);
 const header=document.getElementById('chat-room-header-default');if(!header)return;
 const values=currentChatType==='private'?uwuLastMessageTimes111(chat):{char:null,user:null};
 UwUChatTime115.bind(header, uwuChatMessageTime111(values.char), chat);
 for(const side of ['char','user']) {
  let node=header.querySelector('.'+side+'-last-message-time');
  if(!uwuMetadataRequested111(chat,side+'-last-message-time')){node?.remove();continue;}
  if(!node){node=document.createElement('time');node.className=side+'-last-message-time';header.append(node);}
  node.title=(side==='char'?'角色':'用户')+'最后一条消息的时间';
  uwuFillTime111(node,values[side],chat);node.dataset.empty=String(!values[side]);
 }
}

// Existing layouts retain their DOM/classes. Only the explicit translation-only mode swaps sanitized bubble text.
window.UwUBilingual113=(()=>{
 const choices=new Map(),states=new WeakMap();
 function kind(){return typeof currentChatType==='undefined'?'private':currentChatType;}
 function key(chat,id){return JSON.stringify([kind(),chat.id,chat.activeArchiveId||'',id,chat.bilingualBubbleStyle==='translation-only'?'translation-only':'']);}
 function remember(k,on){choices.delete(k);choices.set(k,on);if(choices.size>2000)choices.delete(choices.keys().next().value);}
 function apply(wrapper,on){
  const state=states.get(wrapper);if(!state)return;
  if(state.only){
   state.text.innerHTML = on ? state.translated : state.original;
   if (state.postTheme && on) {
    state.text.dataset.uwuTranslatedCopy = '';
    state.text.dataset.uwuTranslationLanguage = state.language;
   } else {
    delete state.text.dataset.uwuTranslatedCopy;
    delete state.text.dataset.uwuTranslationLanguage;
   }
  }
  else if(state.outside)state.outside.classList.toggle('active',on);
  else for(const slot of state.slots){
   if(on&&slot.marker.parentNode)slot.marker.replaceWith(slot.node);
   else if(!on&&slot.node.parentNode)slot.node.replaceWith(slot.marker);
  }
  state.on=on;
 }
 function sourceLanguage(text) {

  if (/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text)) return '日语';
  if (/\p{Script=Hangul}/u.test(text)) return '韩语';
  if (/\p{Script=Arabic}/u.test(text)) return '阿拉伯语';
  if (/\p{Script=Thai}/u.test(text)) return '泰语';
  if (/[іїєґ]/iu.test(text)) return '乌克兰语';
  if (/[ыэёъ]/iu.test(text)) return '俄语';
  if (/\p{Script=Devanagari}/u.test(text) && /(?:है|नहीं|और)/u.test(text)) return '印地语';
  const words = new Set((text.toLowerCase().match(/\p{L}+/gu) || []));
  const markers = [
   ['英语', 'the you your and that is are would want my wish command miss have of as if could ever really look away when being this it with for was were what hello love know will can not'],
   ['德语', 'ich du dich ein eine nicht und für ist bin auch mit'],
   ['法语', 'je tu suis une vous avec dans pas bonjour merci est'],
   ['西班牙语', 'una eres estoy tienes siempre para pero gracias hola que']
  ];
  const scores = markers.map(([name, list]) => [name, list.split(' ').filter(word => words.has(word)).length]);
  scores.sort((a, b) => b[1] - a[1]);
  return scores[0][1] >= 2 && scores[0][1] > scores[1][1] ? scores[0][0] : '外语';
 }
 function prepare(wrapper,message,chat,translatedHTML,foreignText=''){
  const bubble=wrapper.querySelector('.bilingual-bubble');if(!bubble)return;
  const postTheme = uwuPostTheme114(chat);
  const language = postTheme ? sourceLanguage(foreignText) : '';
  if(chat.bilingualBubbleStyle==='translation-only'&&typeof translatedHTML==='string'){
   const text=bubble.firstElementChild;if(!text)return;
   const k=key(chat,message.id),on=choices.has(k)?choices.get(k):chat.bilingualAutoShow===true;
   states.set(wrapper,{key:k,only:true,text,original:text.innerHTML,translated:translatedHTML,on,postTheme,language});apply(wrapper,on);return;
  }
  const outside=wrapper.querySelector('.translation-text');
  const slots=Array.from(bubble.querySelectorAll('.translation-inner,.bilingual-divider')).map(node=>({node,marker:document.createComment('translation-visibility')}));
  if (postTheme) {
   for (const node of [outside, ...slots.map(slot => slot.node)]) {
    if (node) node.dataset.uwuTranslationLanguage = language;
   }
  }
  const k=key(chat,message.id),on=choices.has(k)?choices.get(k):outside?chat.bilingualAutoShow===true:true;
  states.set(wrapper,{key:k,outside,slots,on});apply(wrapper,on);
 }
 function toggle(wrapper){const state=states.get(wrapper);if(!state)return false;const on=!state.on;remember(state.key,on);apply(wrapper,on);return true;}
 function reset(chat){for(const k of choices.keys()){const parts=JSON.parse(k);if(parts[0]===kind()&&parts[1]===chat.id)choices.delete(k);}}
 return {prepare,toggle,reset};
})();
