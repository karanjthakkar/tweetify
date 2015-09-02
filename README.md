# Tweetify Backend Infra Doc

1. Cron Job 

    Fetch tweets cron command and log: 
    ```
    /usr/bin/node /home/ubuntu/tweetify/jobs/fetch_tweets.js >> /home/ubuntu/tweetify/jobs/fetch_tweets.log
    ```
    
    Post tweets cron command and log: 
    ```
    /usr/bin/node /home/ubuntu/tweetify/jobs/post_tweets.js >> /home/ubuntu/tweetify/jobs/post_tweets.log
    ```

2. Cron Log location

    ```
    /var/log/syslog
    ```

3. Node service for running tweetify server

        
        description "Tweetify"
        author      "Karan"
        
        stop on shutdown
        respawn
        respawn limit 20 5
        
        # Max open files are @ 1024 by default. Bit few.
        limit nofile 32768 32768
        
        instance $env
        
        script
            #Tweetifyio
            export tweetify_consumer_key=<consumer_key>
            export tweetify_consumer_secret=<consumer_secret>
            export tweetify_access_token=<access_token>
            export tweetify_access_token_secret=<access_secret>
            exec /usr/bin/node /home/ubuntu/tweetify/app.js --environment=$env >> /home/ubuntu/tweetify-out.log 2>>/home/ubuntu/tweetify-err.log
        end script
        


4. Location of conf file for node service

    ```
    /etc/init/tweetify.conf
    ```

5. Node service log location:

    Success: 
    ```
    /home/ubuntu/tweetify-out.log
    ```

    Error: 
    ```
    /home/ubuntu/tweetify-err.log
    ```

6. Command for running node service

    Staging:
    ```
    sudo start tweetify env=staging
    ```
    
    Production
    ```
    sudo start tweetify env=prod
    ```

7. Command for stopping node service

    ```
    sudo stop tweetify env=staging
    ```
    
    OR
    
    ```
    sudo stop tweetify env=prod
    ```
    
8. Trying to acccess mongo cli on EC2 ubuntu has some issues. To fix thos, add the following line to `~/.bashrc`:

    ```
    export LC_ALL=C
    ```