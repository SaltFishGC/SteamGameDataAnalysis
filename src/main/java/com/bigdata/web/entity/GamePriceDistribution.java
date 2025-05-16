package com.bigdata.web.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@TableName("game_price_distribution")
public class GamePriceDistribution {
    private String priceRange;
    private Integer gameCount;
}
