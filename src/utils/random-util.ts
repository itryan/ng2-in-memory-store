export class RandomUtil {
  static getNumber(min: number, max: number) {
    let r = min + Math.round(Math.random() * (max - min));
    return r;
  }

  static getList<T>(list: T[], maxAmount?: number, maxTrial = 4): T[] {
    if (!list || list.length === 0) {
      return [];
    }

    let amount = maxAmount || list.length;
    if (amount > list.length) {
      amount = list.length;
    }
    amount = RandomUtil.getNumber(1, amount);
    let indexes: number[] = [];
    let maxIndex = list.length - 1;
    for (let i = 0; i < amount; i++) {
      let index: number;
      let trial = 0;
      do {
        index = RandomUtil.getNumber(0, maxIndex);
        trial++;
      } while (indexes.indexOf(index) >= 0 && trial < maxTrial)
      indexes.push(index);
    }
    let items: T[] = indexes.map(idx => {
      return list[idx];
    })
    return items;
  }

  static getOne(list: any[]) {
    let index = RandomUtil.getNumber(0, list.length - 1);
    return list[index];
  }

  static createList<TModel>(prefix: string, min: number, max: number, instanceGenerator: (id: number, name: string) => TModel) {
    let amount = RandomUtil.getNumber(min, max);
    let items: TModel[] = [];
    for (let i = 0; i < amount; i++) {
      let item = instanceGenerator(i, prefix + ' ' + String(i));
      items.push(item);
    }
    return items;
  }
}
