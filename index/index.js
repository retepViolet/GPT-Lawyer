const IP = '/'
const uid = getCookie('uid')
console.log(uid)
let files2 = []

function getCookie(cname){
    let name = cname + "=";
    let ca = document.cookie.split(';');
    for(let i=0; i<ca.length; i++){
        let c = ca[i].trim();
        if (c.indexOf(name) == 0 && name.length < c.length)
            return c.substring(name.length,c.length)
    }
    return "";
}

function page_update(files){
    // 获取文件容器
    const fileContainer = document.getElementById('content');
    fileContainer.innerHTML = 
    '<div class="file">\
    <div class="new" onclick="upload_file()">\
        <img src="/static/icon/new.png">打开\
    </div>\
    <div class="upload">\
        <img src="/static/icon/comment_light.png">批注\
        <input type="file" id="fileInput" accept=".docx" style="display:none;">\
    </div>\
    </div>'

    // 动态生成文件显示块并添加到文件容器
    files.forEach(file => {
        const fileElement = document.createElement('div');
        fileElement.className = 'file';

        const passageElement = document.createElement('div');
        passageElement.className = 'passage';

        const titleElement = document.createElement('div');
        titleElement.className = 'title';
        titleElement.textContent = file.name;

        const textElement = document.createElement('div');
        textElement.className = 'text';
        textElement.innerHTML = file.content

        passageElement.appendChild(titleElement);
        passageElement.appendChild(textElement);

        passageElement.onclick = function() {
            open_file(file.id);
        };

        const bottomElement = document.createElement('div');
        bottomElement.className = 'bottom';

        const numElement = document.createElement('text');
        numElement.className = 'num'
        numElement.innerText = file.num == 0 ? '': Math.min(file.num, 99)

        const downloadElement = document.createElement('img');
        downloadElement.src = '/static/icon/download.png';
        downloadElement.onclick = function() {
            download_file(file.id);
        };

        const trashElement = document.createElement('img');
        trashElement.src = '/static/icon/trash_light.png';
        trashElement.onclick = function() {
            delete_file(file.id, fileElement);
        };

        bottomElement.appendChild(numElement);
        bottomElement.appendChild(downloadElement);
        bottomElement.appendChild(trashElement);

        fileElement.appendChild(passageElement);
        fileElement.appendChild(bottomElement);

        fileContainer.appendChild(fileElement);
    });

    document.getElementById('fileInput').addEventListener('change', function() {
        const fileInput = this;
        const file = fileInput.files[0];
    
        if (file) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('knownledge', false);
            
            show_load()
            fetch(IP+'upload?uid='+uid, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                console.log('File uploaded successfully:', data);
                window.location.assign(IP+'file?id='+ encodeURIComponent(data.id));
            })
            .catch(error => {
                console.error('Error uploading file:', error);
                showAlert('上传失败')
            });
        }
    });
}

function upload_file() {
    document.getElementById('fileInput').click();
}

function download_file(id){
    const fileUrl = IP + 'download?id='+id+'&uid='+uid;
    let file_name = '下载文件'
    showAlert('文件下载中...')
    fetch(fileUrl)
    .then(response => {
        if (!response.ok){
            showAlert('网络错误')
            throw new Error('Network response was not ok');
        }
        const filenameHeader = response.headers.get('Content-Disposition');
        const filenameMatch = /filename="(.+?)"/.exec(filenameHeader);
        file_name = filenameMatch ? filenameMatch[1] : '下载文件';
        return response.blob();
    })
    .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file_name
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    })
    .catch(error => {
        showAlert('网络错误')
        console.error('Error during fetch operation:', error);
    });
}

function delete_file(id, element){
    fetch(IP+'delete_file?id='+id+'&uid='+uid, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                console.log('File delete successfully:', data);
                showAlert('“'+data.name+'” 已被移至回收站')
                element.parentElement.removeChild(element)
                // main()
            })
            .catch(error => {
                console.error('Error uploading file:', error);
                showAlert('网络错误')
            });
}

function open_file(id){
    window.location.assign(IP+'file?id='+ encodeURIComponent(id));
}

function show_load(){
    document.getElementById("search").style.display = 'none'
    document.getElementById("content").style.display = 'none'
    const loader = document.getElementById("loaderbg")
    loader.classList.add('loaderbg')
    loader.style.display = 'block'
    setTimeout(function() {
        loader.innerHTML = 
        '<div class="spinner">\
            <div class="double rect1"></div>\
            <div class="double rect2"></div>\
            <div class="double rect3"></div>\
            <div class="double rect4"></div>\
            <div class="double rect5"></div>\
        </div>'
    }, 500);
}

function hide_load(){
    document.getElementById("search").style.display = 'flex'
    document.getElementById("content").style.display = 'block'
    const loader = document.getElementById("loaderbg")
    loader.style.display = 'none'
    loader.classList.remove('loaderbg')
    setTimeout(function() {
        loader.innerHTML = ''
    }, 500);
}

function search(){
    input = document.getElementById('searchBox').value
    found = []
    files2.forEach(file => {
        if(file.name.indexOf(input)!=-1)
            found.push(file)
    });
    page_update(found)
}

function main(){
    document.getElementById('sidebar').style.display='block'
    files2 = []
    show_load()
    fetch(IP + 'get_all_file?uid='+uid)
    .then(response => {
        if (!response.ok){
            showAlert('网络错误')
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // 处理返回的数据
        console.log(data)
        files2 = data
        page_update(data)
        document.getElementById('search').style.display = "flex"
        hide_load()
    })
    .catch(error => {
        // 处理错误
        showAlert('网络错误')
        console.error('There was a problem with the fetch operation:', error);
    });
}

function showAlert(message) {
    const alertBox = document.getElementById('alert-box');
    if(alertBox.innerText!='')return
    alertBox.innerText = message
    alertBox.style.transform = 'translateX(-50%) translateY(0%)'; // 滑入屏幕
    setTimeout(function() {
        alertBox.style.transform = 'translateX(-50%) translateY(-100%)'; // 滑出屏幕
    }, 1500); // 5秒后滑出
    setTimeout(function() {
      alertBox.innerText = ''
    }, 2000);
}

if(uid.length == 0)
    window.location.assign(IP+'login');
else main()