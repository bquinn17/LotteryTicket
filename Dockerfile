FROM antage/apache2-php5
RUN rm /var/www/html/index.html
RUN echo "DirectoryIndex index.phtml \n" > /etc/apache2/mods-enabled/dir.conf
COPY ./ /var/www/html/
