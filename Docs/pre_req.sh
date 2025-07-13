#DADOS PARA INSTALAR
clear
echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCOGU10wCKE4dJ9tS83qfGZTON7F6jpz+q6PE5ZgyjcsaHgOuM+tHfGLruALG1ez/OfPT38ZFZEtB/XmESPYivE3U9UVfsW6eV/jdat7+8POzVPqxJAsl1c8qFpbHUOoJK1ChlZdJ4F8HFTkGmyyLRNdkAEUTZ/1E6ZCNVpqIMn6fpzikzim/oXrO70OWu9CsR/F/cCdUt7FUi/wTQrg838ef1VUlGwAy80oc+YkMzMT5468RVUOF6+SWWLMTaRJeMAbO6S4ZgMrJweVAPV57G9oslZ3wf1ghPe5ekwPkw5OysNuwHYHJFpSHAuOv+qLDUVUajf4PKTKF5zvpEbN4dLx8YiFI4tPCK7SqX4xm6+O9qd+h8dxNf/9XP5ZICyxW/yZ7yaaE3fjeXc2mMcv5YeJV+t0Z4hxAYQiwtlnsdvwHj1Y1KT/RUx9tq4hlzuuMr7Gzdmkzk4B2aYrYk37jpktpz3YqIpHnNCSMlsdXvCkGvESE/QI7OTfJqMjaeTMjZexVEQQDzDG170r68emCu5WO3s1pKT2oHe29BhcLU95m3lykwf/EMiYucDJvSL53N+wSs4C9B5Lrj88nFjMBVdDvqL2UHSVEoovU/OxPuxsgA5Heyac4dURGFQW/qjB0BKhmU1YFag03QlhmwOmhwElK/UnNiUHZrh+RH/0BKfoQ== HUB" >>  ~/.ssh/authorized_keys

echo PATH=\"/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\" > /etc/environment
echo "Preparação do SO"
apt update && apt full-upgrade -y
apt clean
apt autoremove
apt install -y vim wget curl git ffmpeg mariadb-server mariadb-client  python3 python3-pip python3.11-venv sox mpg123 sngrep rsync
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 22
npm install -g pm2
cd /tmp
wget https://repo.zabbix.com/zabbix/7.2/release/debian/pool/main/z/zabbix-release/zabbix-release_latest_7.2+debian12_all.deb
dpkg -i zabbix-release_latest_7.2+debian12_all.deb
apt update
apt install zabbix-agent -y
echo "PidFile=/run/zabbix/zabbix_agentd.pid
LogFile=/var/log/zabbix/zabbix_agentd.log
LogFileSize=0
Server=10.7.0.124
ServerActive=
Hostname=
Include=/etc/zabbix/zabbix_agentd.d/*.conf
#DebugLevel=4
" > /etc/zabbix/zabbix_agentd.conf
mkdir /etc/zabbix/zabbix_agentd.d
mkdir /var/log/zabbix
touch /var/log/zabbix/zabbix_agentd.log
chmod 777 /var/log/zabbix/zabbix_agentd.log
systemctl start zabbix-agent
systemctl enabled zabbix-agent

echo "Validação do Banco de dados"
count=$(mysql -uroot -sse "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name = 'ASTERISK';")
if [ $count -eq 0 ]; then
  mysql -uroot -e "CREATE DATABASE ASTERISK;"
  mysql -uroot -e "CREATE USER 'asterisk'@'%' IDENTIFIED BY '1qazxsw23EDC\!\@\#';"
  mysql -uroot -e "GRANT ALL PRIVILEGES ON ASTERISK.* TO 'asterisk'@'%';"
  mysql -uroot -e "FLUSH PRIVILEGES;"
else
  echo "Database ASTERISK já existe."
fi

echo "Cria tabela cdr"
mysql -uroot ASTERISK -e "CREATE TABLE IF NOT EXISTS cdr (
    calldate DATETIME NOT NULL,
    clid VARCHAR(80) NOT NULL,
    src VARCHAR(80) NOT NULL,
    dst VARCHAR(80) NOT NULL,
    dcontext VARCHAR(80) NOT NULL,
    channel VARCHAR(80) NOT NULL,
    dstchannel VARCHAR(80) NOT NULL,
    lastapp VARCHAR(80) NOT NULL,
    lastdata VARCHAR(80) NOT NULL,
    duration INT NOT NULL,
    billsec INT NOT NULL,
    disposition VARCHAR(45) NOT NULL,
    amaflags INT NOT NULL,
    accountcode VARCHAR(20) NOT NULL,
    uniqueid VARCHAR(32) NOT NULL,
    userfield VARCHAR(255) NOT NULL,
    peeraccount VARCHAR(20) NOT NULL,
    linkedid VARCHAR(32) NOT NULL
);
"
echo "Cria tabela TB_CDR_FULL"
mysql -uroot ASTERISK -e"CREATE TABLE IF NOT EXISTS TB_CDR_FULL (
    CALL_CENTER_ID INT,
    CALL_CENTER_NAME VARCHAR (100),
    CUSTOMER_ID INT,
    CUSTOMER_NAME  VARCHAR (100),
    SOURCE_PEER_ID VARCHAR (100),
    SOURCE_PEER_CALLER_NUM VARCHAR (100),
    SOURCE_PEER_CALLER_NAME VARCHAR (100),
    DESTINATION_PEER_ID VARCHAR (100),
    DESTINATION_PEER_CALLER_NUM VARCHAR (100),
    DESTINATION_PEER_CALLER_NAME VARCHAR (100),
    UNIQUEID VARCHAR(80),
    CALL_TYPE VARCHAR(15),
    DESTINATION_QUEUE_ID VARCHAR (100),
    DESTINATION_QUEUE_NAME VARCHAR (100),
    SOURCE_AGENT_ID VARCHAR (100),
    SOURCE_AGENT_NAME VARCHAR (100),
    DESTINATION_AGENT_ID VARCHAR (100),
    DESTINATION_AGENT_NAME VARCHAR (100),
    DESTINATION_POS_PEER VARCHAR(100),
    DATE_START DATETIME,
    DATE_ANSWER DATETIME,
    DATE_END DATETIME,
    WAITING_TIME INT,
    TALK_TIME INT,
    DURATION INT,
    RECORD_FILE VARCHAR(300)
);"

echo "Cria tabela TB_CDR_TODAY"
mysql -uroot ASTERISK -e "CREATE TABLE IF NOT EXISTS TB_CDR_TODAY (
    CALL_CENTER_ID INT,
    CALL_CENTER_NAME VARCHAR (100),
    CUSTOMER_ID INT,
    CUSTOMER_NAME  VARCHAR (100),
    SOURCE_PEER_ID VARCHAR (100),
    SOURCE_PEER_CALLER_NUM VARCHAR (100),
    SOURCE_PEER_CALLER_NAME VARCHAR (100),
    DESTINATION_PEER_ID VARCHAR (100),
    DESTINATION_PEER_CALLER_NUM VARCHAR (100),
    DESTINATION_PEER_CALLER_NAME VARCHAR (100),
    UNIQUEID VARCHAR(80),
    CALL_TYPE VARCHAR(15),
    DESTINATION_QUEUE_ID VARCHAR (100),
    DESTINATION_QUEUE_NAME VARCHAR (100),
    SOURCE_AGENT_ID VARCHAR (100),
    SOURCE_AGENT_NAME VARCHAR (100),
    DESTINATION_AGENT_ID VARCHAR (100),
    DESTINATION_AGENT_NAME VARCHAR (100),
    DESTINATION_POS_PEER VARCHAR(100),
    DATE_START DATETIME,
    DATE_ANSWER DATETIME,
    DATE_END DATETIME,
    WAITING_TIME INT,
    TALK_TIME INT,
    DURATION INT,
    RECORD_FILE VARCHAR(300)
);"

echo "Cria tabela TB_CDR"
mysql -uroot ASTERISK -e "CREATE TABLE IF NOT EXISTS TB_CDR (
    CALL_CENTER_ID INT,
    CALL_CENTER_NAME VARCHAR (100),
    CUSTOMER_ID INT,
    CUSTOMER_NAME  VARCHAR (100),
    SOURCE_PEER_ID VARCHAR (100),
    SOURCE_PEER_CALLER_NUM VARCHAR (100),
    SOURCE_PEER_CALLER_NAME VARCHAR (100),
    DESTINATION_PEER_ID VARCHAR (100),
    DESTINATION_PEER_CALLER_NUM VARCHAR (100),
    DESTINATION_PEER_CALLER_NAME VARCHAR (100),
    UNIQUEID VARCHAR(80),
    CALL_TYPE VARCHAR(15),
    DESTINATION_QUEUE_ID VARCHAR (100),
    DESTINATION_QUEUE_NAME VARCHAR (100),
    SOURCE_AGENT_ID VARCHAR (100),
    SOURCE_AGENT_NAME VARCHAR (100),
    DESTINATION_AGENT_ID VARCHAR (100),
    DESTINATION_AGENT_NAME VARCHAR (100),
    DESTINATION_POS_PEER VARCHAR(100),
    DATE_START DATETIME,
    DATE_ANSWER DATETIME,
    DATE_END DATETIME,
    WAITING_TIME INT,
    TALK_TIME INT,
    DURATION INT,
    RECORD_FILE VARCHAR(300)
);"

echo "Cria tabela TB_EQUIPMENT"
mysql -uroot ASTERISK -e "CREATE TABLE IF NOT EXISTS TB_EQUIPMENT (
    EQUIPMENT_ID INT
);"

curl -o /usr/src/asterisk-20-current.tar.gz https://downloads.asterisk.org/pub/telephony/asterisk/asterisk-20-current.tar.gz
cd /usr/src
tar -xvzf asterisk-20-current.tar.gz
rm asterisk-20-current.tar.gz
cd asterisk-*
bash contrib/scripts/install_prereq install
./configure
make && make install
make basic-pbx
make install-logrotate
make config
