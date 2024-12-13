const IP = '/'
let sms_code = ''

document.getElementById('loginForm').addEventListener('submit', async function(event) {
    event.preventDefault(); 
    const formData = new FormData(this);
    const response = await fetch('/login', {
        method: 'POST',
        body: formData
      });
    
      if (response.ok) {
        const data = await response.json();
        if(data=='error'){
          showAlert('手机号或密码错误')
        }
        else{
          console.log('Server data:', data);
          document.cookie = "uid=" + data + "; max-age=2592000; path=/";
          window.location.assign(IP);
        }
      } else {
        showAlert('网络错误')
        console.error('Server responded with an error:', response.statusText);
      }
      hide_load()
});

document.getElementById('registerForm').addEventListener('submit', async function(event) {
  event.preventDefault(); 
  if(sms_code=='' || document.getElementById('smsCode2').value != sms_code)
    showAlert('验证码错误')
  else if(document.getElementById('pass_word').value == document.getElementById('pass_word2').value){
    const formData = new FormData(this);
    const response = await fetch('/register', {
        method: 'POST',
        body: formData
      });
    
      if (response.ok) {
        showAlert('注册成功')
        console.log(response.json())
        return_login()
      } 
      else showAlert('手机号已注册');
      hide_load
  }
  else showAlert('密码不一致')
});

document.getElementById('passwordForm').addEventListener('submit', async function(event) {
  event.preventDefault(); 
  if(sms_code=='' || document.getElementById('smsCode1').value != sms_code)
    showAlert('验证码错误')
  else if(document.getElementById('pass__word').value == document.getElementById('pass__word2').value){
    const formData = new FormData(this);
    const response = await fetch('/password_reset', {
        method: 'POST',
        body: formData
      });
    
      if (response.ok) {
        showAlert('密码已更新')
        console.log(response.json())
        return_login()
      } 
      else{
        showAlert('手机号未注册')
        console.error('Server responded with an error:', response.statusText);
      }
      hide_load()
  }
  else showAlert('密码不一致')
});

function register(){
  document.getElementById('register-container').style.display = 'block'
  document.getElementById('login-container').style.display = 'none'
  sms_code = ''
}

function forgot_password(){
  document.getElementById('password-container').style.display = 'block'
  document.getElementById('login-container').style.display = 'none'
  sms_code = ''
}

function sendSms1(){
  button = document.getElementById('sendSmsCode1')
  const phone = document.getElementById('phone_').value
  if(phone.length!=11){
    showAlert('请填写正确的手机号')
    return
  }
  button.disabled = true
  console.log(phone)
  fetch(IP+'get_sms?phone='+phone)
    .then(response => {
        if (!response.ok){
          showAlert('网络错误')
          throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
      sms_code = data
      button.innerText = '已发送'
    })
    .catch(error => {
      showAlert('网络错误')
      console.error('There was a problem with the fetch operation:', error);
    });
}

function sendSms2(){
  button = document.getElementById('sendSmsCode2')
  const phone = document.getElementById('phone').value
  if(phone.length!=11){
    showAlert('请填写正确的手机号')
    return
  }
  console.log(phone)
  button.disabled = true
  fetch(IP+'get_sms?phone='+phone)
    .then(response => {
        if (!response.ok){
          showAlert('网络错误')
          throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
      sms_code = data
      button.innerText = '已发送'
    })
    .catch(error => {
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
        alertBox.style.transform = 'translateX(-50%) translateY(-110%)'; // 滑出屏幕
  }, 1500); // 5秒后滑出
  setTimeout(function() {
    alertBox.innerText = ''
  }, 2000);
}

function return_login(){
  document.getElementById('password-container').style.display = 'none'
  document.getElementById('register-container').style.display = 'none'
  document.getElementById('login-container').style.display = 'block'
}

function change_phone(){
  sms_code = ''
  const button1 = document.getElementById('sendSmsCode1')
  const button2 = document.getElementById('sendSmsCode2')
  button1.disabled = false
  button2.disabled = false
  button1.innerText = '获取验证码'
  button2.innerText = '获取验证码'
}

function show_load(){
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
  }, 100);
}

function hide_load(){
  const loader = document.getElementById("loaderbg")
  loader.style.display = 'none'
  loader.classList.remove('loaderbg')
  setTimeout(function() {
      loader.innerHTML = ''
  }, 100);
}