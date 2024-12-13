const IP = '/'
let uid = getCookie('uid')
console.log(uid)

function getCookie(cname){
    let name = cname + "=";
    let ca = document.cookie.split(';');
    for(let i=0; i<ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(name)==0 && name.length < c.length)
            return c.substring(name.length,c.length);
    }
    return "";
}

function show_load(){
    document.getElementById("loaderbg").innerHTML = 
    '<div class="spinner">\
        <div class="double rect1"></div>\
        <div class="double rect2"></div>\
        <div class="double rect3"></div>\
        <div class="double rect4"></div>\
        <div class="double rect5"></div>\
    </div>'
    document.getElementById("loaderbg").classList.add('loaderbg')
}

function hide_load(){
    document.getElementById("loaderbg").innerHTML = ''
    document.getElementById("loaderbg").classList.remove('loaderbg')
}

if(uid.length == 0)
    window.location.assign(IP+'login');