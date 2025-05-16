package com.bigdata.web;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.bigdata.web.mapper")
public class BigDataWebApplication {

    public static void main(String[] args) {
        SpringApplication.run(BigDataWebApplication.class, args);
    }

}
