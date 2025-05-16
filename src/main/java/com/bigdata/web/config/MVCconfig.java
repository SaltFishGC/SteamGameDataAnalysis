package com.bigdata.web.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class MVCconfig implements WebMvcConfigurer {
    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // 请注意视图web页面是页面，它的url不能和接口重合
        //示例：registry.addViewController("/").setViewName("welcome");
        registry.addViewController("/").setViewName("welcome");
        registry.addViewController("/visualization").setViewName("visualization");
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 添加静态资源映射规则
        registry.addResourceHandler("/static/**").addResourceLocations("classpath:/static/");
        // 配置 knife4j 的静态资源请求映射地址
        registry.addResourceHandler("/doc.html").addResourceLocations("classpath:/META-INF/resources/");
        registry.addResourceHandler("/webjars/**").addResourceLocations("classpath:/META-INF/resources/webjars/");
        // 添加视频资源映射
        registry.addResourceHandler("/videos/**").addResourceLocations("classpath:/static/videos/");
        // 添加图片资源映射
        registry.addResourceHandler("/pic/**").addResourceLocations("classpath:/static/pic/");

    }
}
