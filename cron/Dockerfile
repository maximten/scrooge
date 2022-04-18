FROM ubuntu:22.04
RUN apt-get update
RUN apt-get -y install cron curl
RUN touch /var/log/cron.log
ADD crontab /etc/cron.d/update_rates_cron
ADD update_rates.sh /app/update_rates.sh
RUN chmod +x /app/update_rates.sh
RUN crontab /etc/cron.d/update_rates_cron
CMD ["cron", "-f"]