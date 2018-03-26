from selenium import webdriver
from selenium.webdriver.common.keys import Keys
import time
from selenium.webdriver.firefox.firefox_binary import FirefoxBinary

binary = FirefoxBinary('/usr/bin/firefox')
browser = webdriver.Firefox(firefox_binary=binary)

browser.get("http://localhost:3000")
# browser.get("")
time.sleep(1)
username = browser.find_element_by_id('username')
password = browser.find_element_by_id('password')

print("username is ",username)
print(password)

name="teacher@gmail.com"
passw="teacher"

username.send_keys(name)
password.send_keys(passw)

login_attempt = browser.find_element_by_xpath("//*[@type='submit']") 
login_attempt.submit()